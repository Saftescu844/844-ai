import { afterEach, describe, expect, it, vi } from 'vitest'
import { prequalifyProductionScheduleCandidates, PRODUCTION_PREFLIGHT_TIMEOUT_MS } from '../../src/lib/flash/ingestion/flashProductionSchedulePrequalification'
import { planProductionScheduleCandidates, reserveProductionScheduleAttempt, selectAndReserveProductionCandidate } from '../../src/lib/flash/ingestion/flashProductionSchedulePolicy'
import type { FlashRssCandidate, FlashRssIngestionSourcePlan } from '../../src/lib/flash/ingestion/rssCandidateIngestion'
import type { retrieveFlashSource } from '../../src/lib/flash/runtimeEvidence/sourceRetriever'

const now = Date.parse('2026-10-30T08:00:00Z')
const plan: FlashRssIngestionSourcePlan = { sourceId: 6, sourceName: 'MIT', registeredSourceUrl: 'https://news.mit.edu/', feedUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2', sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase', allowAutoPublish: false, candidateSkipMemory: [], ready: true, blocker: null }
const source = (id: number, memory: unknown = []) => ({ id, allowIngestion: true, allowAutoPublish: false, rssCandidateSkipMemory: memory })
function candidate(slug: string, date = '2026-10-28T00:00:00Z'): FlashRssCandidate {
  return { sourceId: 6, sourceName: 'MIT', sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase', feedUrl: plan.feedUrl!, title: slug, concreteUrl: `https://news.mit.edu/2026/${slug}-1028`, publishedAt: date, summary: null }
}
function html({ paper = true, date = '2026-10-28', lead = 'A research report.' } = {}): string {
  const displayDate = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `<html lang="en"><head><meta name="description" content="${lead}"></head><body><main><article><h1>A research tool</h1><time datetime="${date}">${displayDate}</time><div class="news-article--content--body--inner"><p>A synthetic research description with limitations.</p></div>${paper ? '<a href="http://arxiv.org/abs/2609.11077">Paper: X-Hinges</a>' : ''}</article></main></body></html>`
}
function retrieval(url: string, body = html()): Awaited<ReturnType<typeof retrieveFlashSource>> {
  return { candidate: { id: 'fixture', registeredSourceUrl: plan.registeredSourceUrl, concreteUrl: url, finalUrl: url, retrieved: true, contentAvailable: true }, statusCode: 200, contentType: 'text/html', bytesRead: body.length, textContent: body, failureReason: null, networkPolicyReason: null }
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('Production provider-free prequalification', () => {
  it('skips a newer pending article before reserving exactly the older grounded candidate', async () => {
    const newer = candidate('profile')
    const older = candidate('study', '2026-10-27T00:00:00Z')
    const retrieve = vi.fn(async input => retrieval(input.concreteUrl, html({ paper: input.concreteUrl === older.concreteUrl })))
    const preflight = await prequalifyProductionScheduleCandidates({ candidates: [newer, older], plans: [plan], now, retrieve })
    expect(preflight.rejected.identity_pending).toBe(1)
    expect(preflight.candidates.map(c => c.concreteUrl)).toEqual([older.concreteUrl])
    const saveMemory = vi.fn().mockResolvedValue(undefined)
    const selected = await selectAndReserveProductionCandidate({ candidates: preflight.candidates, sources: [source(5), source(6)], usedUrls: new Set(), now, dryRun: false, saveMemory })
    expect(selected.candidate?.concreteUrl).toBe(older.concreteUrl)
    expect(saveMemory).toHaveBeenCalledTimes(1)
    expect(saveMemory.mock.calls[0][1]).toEqual([{ url: older.concreteUrl, reason: 'production_scheduled_attempt', skippedAt: new Date(now).toISOString() }])
  })

  it('returns no candidates or reservations when all readable articles lack grounded identity', async () => {
    const item = candidate('profile')
    const preflight = await prequalifyProductionScheduleCandidates({ candidates: [item], plans: [plan], now, retrieve: async input => retrieval(input.concreteUrl, html({ paper: false })) })
    const saveMemory = vi.fn()
    expect((await selectAndReserveProductionCandidate({ candidates: preflight.candidates, sources: [source(5), source(6)], usedUrls: new Set(), now, dryRun: false, saveMemory })).outcome).toBe('empty')
    expect(saveMemory).not.toHaveBeenCalled()
  })

  it('uses fresh locked state to reject a newly spent budget, disabled source or newly used URL', async () => {
    const item = candidate('study')
    const preflight = await prequalifyProductionScheduleCandidates({ candidates: [item], plans: [plan], now, retrieve: async input => retrieval(input.concreteUrl) })
    expect(preflight.candidates).toHaveLength(1)
    const spent = reserveProductionScheduleAttempt(reserveProductionScheduleAttempt([], 'https://news.mit.edu/2026/a-1028', now - 1000), 'https://news.mit.edu/2026/b-1028', now - 500)
    const saveMemory = vi.fn()
    for (const state of [
      { sources: [source(5), source(6, spent)], usedUrls: new Set<string>(), expected: 'budget_reached' },
      { sources: [source(5), { ...source(6), allowIngestion: false }], usedUrls: new Set<string>(), expected: 'empty' },
      { sources: [source(5), source(6)], usedUrls: new Set([item.concreteUrl]), expected: 'empty' },
    ]) {
      expect((await selectAndReserveProductionCandidate({ ...state, candidates: preflight.candidates, now, dryRun: false, saveMemory })).outcome).toBe(state.expected)
    }
    expect(saveMemory).not.toHaveBeenCalled()
    expect(planProductionScheduleCandidates({ candidates: [item], sources: [source(5), source(6, spent)], usedUrls: new Set(), now }).candidates).toEqual([])
  })

  it('retains the existing ambiguous-identity rejection without choosing one identifier', async () => {
    const item = candidate('ambiguous')
    const result = await prequalifyProductionScheduleCandidates({ candidates: [item], plans: [plan], now, retrieve: async input => retrieval(input.concreteUrl, html({ paper: false, lead: 'doi:10.1234/alpha and doi:10.1234/beta' })) })
    expect(result.candidates).toEqual([])
    expect(result.rejected.identity_ambiguous).toBe(1)
  })

  it('rejects stale article dates, broken extraction, redirected host mismatch and raw retrieval failures without leaking diagnostics', async () => {
    const items = ['stale', 'broken', 'redirected', 'failed'].map(slug => candidate(slug))
    const retrieve = vi.fn(async input => {
      if (input.concreteUrl.includes('/failed-')) throw new Error('private-api-key source-body')
      if (input.concreteUrl.includes('/stale-')) return retrieval(input.concreteUrl, html({ date: '2026-09-01' }))
      if (input.concreteUrl.includes('/broken-')) return retrieval(input.concreteUrl, '<html>private-source-body</html>')
      return { ...retrieval(input.concreteUrl), candidate: { ...retrieval(input.concreteUrl).candidate, finalUrl: 'https://evil.example/2026/story-1028' } }
    })
    const result = await prequalifyProductionScheduleCandidates({ candidates: items, plans: [plan], now, retrieve })
    expect(result.candidates).toEqual([])
    expect(result.rejected).toMatchObject({ article_not_current: 1, extraction_failed: 2, retrieval_failed: 1 })
    expect(JSON.stringify(result)).not.toMatch(/private|evil\.example|api-key/)
  })

  it('bounds concurrent reads to two and preserves chronological input order despite completion order', async () => {
    let active = 0
    let maximum = 0
    const items = ['a', 'b', 'c', 'd', 'e'].map(slug => candidate(slug))
    const result = await prequalifyProductionScheduleCandidates({ candidates: items, plans: [plan], now, retrieve: async input => {
      active += 1; maximum = Math.max(active, maximum)
      await new Promise(resolve => setTimeout(resolve, input.concreteUrl.includes('/a-') ? 5 : 1))
      active -= 1
      return retrieval(input.concreteUrl)
    } })
    expect(maximum).toBe(2)
    expect(result.candidates.map(c => c.concreteUrl)).toEqual(items.map(c => c.concreteUrl))
  })

  it('rejects more than twenty articles before reading any page and ignores unavailable or AUTO-enabled source plans', async () => {
    const retrieve = vi.fn()
    await expect(prequalifyProductionScheduleCandidates({ candidates: Array.from({ length: 21 }, () => candidate('study')), plans: [plan], now, retrieve })).rejects.toThrow('limit')
    for (const plans of [[], [{ ...plan, allowAutoPublish: true }], [{ ...plan, ready: false }]]) {
      const result = await prequalifyProductionScheduleCandidates({ candidates: [candidate('study')], plans, now, retrieve })
      expect(result.rejected.source_unavailable).toBe(1)
    }
    expect(retrieve).not.toHaveBeenCalled()
  })

  it('fails closed at the total preflight deadline without starting more reads or reserving anything', async () => {
    vi.useFakeTimers()
    const retrieve = vi.fn(() => new Promise<Awaited<ReturnType<typeof retrieveFlashSource>>>(() => {}))
    const result = prequalifyProductionScheduleCandidates({ candidates: ['a', 'b', 'c'].map(slug => candidate(slug)), plans: [plan], now, retrieve })
    const rejected = expect(result).rejects.toThrow('deadline')
    await vi.advanceTimersByTimeAsync(PRODUCTION_PREFLIGHT_TIMEOUT_MS)
    await rejected
    expect(retrieve).toHaveBeenCalledTimes(2)
  })
})
