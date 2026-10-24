// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { diagnoseRuntimeEditorialSelection, serializeEditorialDiagnostic,
  parseEditorialDiagnostic, observeEditorialDiagnostic } from '@/lib/flash/ingestion/editorialSelectionDiagnostic'
import { FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'
import type { FlashNormalizedArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import type { Payload } from 'payload'

const candidate = { sourceAdapter: 'mit-news', finalUrl: 'https://news.mit.edu/2026/example-1008',
  sourcePublicationDate: '2026-10-08' } as FlashNormalizedArticleCandidate
const topics = '<div class="news-article--topics"><a href="/topic/interview">Interview</a></div>'
function diagnose(html: string, patch: Partial<Parameters<typeof diagnoseRuntimeEditorialSelection>[0]> = {}) {
  return diagnoseRuntimeEditorialSelection({ html, candidate, sourceVerified: true,
    identityStatus: 'pending', assessedAt: '2026-10-24T16:03:00Z', ...patch })
}

describe('runtime editorial diagnostic without selection authority', () => {
  it('observes the explicit MIT article topic but leaves claims/relevance/timeliness for review', () => {
    const result = diagnose(`<main>${topics}</main>`)
    expect(result).toMatchObject({ sourceFormat: 'interview', editorialDisposition: 'review_required', generationAllowed: false, ageDays: 16 })
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['claims_unresolved', 'relevance_not_established', 'timeliness_unresolved', 'identity_unresolved']))
  })

  it('does not infer research or profile from titles, Paper links, or faculty topics', () => {
    const result = diagnose('<main><h1>AI research breakthrough</h1><p>Paper: <a href="https://arxiv.org/abs/2601.12345">Paper</a></p><div class="news-article--topics"><a href="/topic/faculty">Faculty</a></div></main>')
    expect(result.sourceFormat).toBe('unknown')
    expect(result.editorialDisposition).toBe('review_required')
  })

  it('ignores navigation, related teasers, hidden content and external lookalike metadata', () => {
    for (const html of [
      `<main><nav>${topics}</nav></main>`, `<main><aside>${topics}</aside></main>`,
      `<main><div hidden>${topics}</div></main>`, `<main><div aria-hidden="true">${topics}</div></main>`,
      `<main><div class="news-article--recent-news--teaser">${topics}</div></main>`,
      `<main>${topics.replace('/topic/interview', 'https://attacker.example/topic/interview')}</main>`,
      `<main><a href="/topic/interview">Interview</a></main>`,
      `<footer>${topics}</footer><main/>`,
    ]) expect(diagnose(html).sourceFormat).toBe('unknown')
  })

  it('fails to unknown for ambiguous containers and missing main, or failed source verification', () => {
    for (const html of [topics, `<main>${topics}${topics}</main>`, `<main>${topics}</main><main/>`]) {
      expect(diagnose(html).sourceFormat).toBe('unknown')
    }
    expect(diagnose(`<main>${topics}</main>`, { sourceVerified: false }).sourceFormat).toBe('unknown')
    expect(diagnose(`<main>${topics}</main>`, { candidate: { ...candidate, sourceAdapter: 'google-research' } }).sourceFormat).toBe('unknown')
  })

  it('transports only bounded controlled metadata, with no source text or URL', () => {
    const line = serializeEditorialDiagnostic(diagnose(`<main>${topics}<p>secret arbitrary text</p></main>`))
    expect(line).not.toContain('secret')
    expect(line).not.toContain('https:')
    expect(parseEditorialDiagnostic(line)).toMatchObject({ format: 'interview', identity: 'pending', disposition: 'review_required', dateKnown: true })
  })

  it('rejects arbitrary child data, unknown versions, generation permissions and missing guard markers', () => {
    const valid = serializeEditorialDiagnostic(diagnose(`<main>${topics}</main>`))
    for (const line of [valid.replace('v=1', 'v=2'), valid.replace('generationAllowed=false', 'generationAllowed=true'),
      valid.replace('format=interview', 'format=secret'), valid.replace('claims_unresolved', 'https://secret.example'),
      valid.replace(',writer_gates_not_evaluated', ''), valid + ' arbitrary stderr', 'x'.repeat(801)]) {
      expect(parseEditorialDiagnostic(line)).toBeNull()
    }
  })

  it('observes success or failure stdout without forwarding arbitrary stderr, and ignores duplicate reports', () => {
    const line = serializeEditorialDiagnostic(diagnose(`<main>${topics}</main>`))
    const callback = vi.fn()
    observeEditorialDiagnostic(`arbitrary stdout\n${line}\nother output`, callback)
    expect(callback).toHaveBeenCalledOnce()
    callback.mockClear()
    observeEditorialDiagnostic(`${line}\n${line}`, callback)
    observeEditorialDiagnostic('arbitrary stderr', callback)
    expect(callback).not.toHaveBeenCalled()
    expect(() => observeEditorialDiagnostic(line, () => { throw Error('audit unavailable') })).not.toThrow()
  })

  it('stores metadata in the existing run audit without changing outcome, attempt count or pair IDs', async () => {
    const create = vi.fn().mockResolvedValue({ id: 9 })
    const update = vi.fn().mockResolvedValue({ id: 9 })
    const lines: string[] = []
    const audit = new FlashRssRunDiagnostics(line => lines.push(line), () => 1000)
    await audit.start({ create, update } as unknown as Pick<Payload, 'create' | 'update'>, 'test', 'sha')
    audit.candidate(1, 6)
    const line = serializeEditorialDiagnostic(diagnose(`<main>${topics}</main>`))
    observeEditorialDiagnostic(line, metadata => audit.editorialDiagnostic(metadata))
    audit.skipped('event_identity_not_grounded')
    audit.result('no-eligible-candidate')
    await audit.finish()
    expect(update.mock.lastCall?.[0].data).toMatchObject({ status: 'completed', evidenceSummary: {
      editorialHandoffDiagnosticCount: 1, lastEditorialFormat: 'interview', lastEditorialDisposition: 'review_required',
      attemptedCount: 1, skippedCount: 1, outcome: 'no-eligible-candidate', roId: null, enId: null,
    } })
    expect([...create.mock.calls, ...update.mock.calls].every(([arg]) => arg.collection === 'flash-engine-runs')).toBe(true)
    expect(lines.join('')).not.toContain('https:')
  })
})
