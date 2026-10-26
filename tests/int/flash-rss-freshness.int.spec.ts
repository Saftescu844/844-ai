// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  assessFlashPublicationFreshness, filterFlashRssFreshCandidates,
  flashPublicationTimestamp, parseFlashRssMaxAgeDays,
} from '@/lib/flash/ingestion/flashPublicationFreshness'
import { parseFlashRssCandidates, type FlashRssIngestionSourcePlan } from '@/lib/flash/ingestion/rssCandidateIngestion'
import { runFlashRssStageNextAttempts } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'
import { FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'

const now = Date.parse('2026-10-26T09:00:00Z')
const policy = { now, maxAgeDays: 30 }
const plan: FlashRssIngestionSourcePlan = {
  sourceId: 5, sourceName: 'Google Research', registeredSourceUrl: 'https://research.google/',
  feedUrl: 'https://research.google/feed', sourceRole: 'primary', editorialTrust: 'high',
  citationMode: 'direct', allowAutoPublish: false, maxCandidatesPerScan: 10,
  maxCandidatesPerDay: 40, candidateSkipMemory: [], ready: true, blocker: null,
}

describe('Automatic RSS publication freshness', () => {
  it.each([
    ['2026-10-26T09:00:00Z', true], ['2026-09-26T09:00:00Z', true],
    ['2026-09-26T08:59:59.999Z', false], ['2026-10-26T09:00:00.001Z', false],
    ['2026-10-26T11:00:00+02:00', true], ['2026-05-01', false],
  ])('uses the same exact rolling UTC boundary for %s', (date, eligible) => {
    expect(assessFlashPublicationFreshness(date as string, policy).eligible).toBe(eligible)
  })

  it.each([
    [null, 'missing_date'], ['', 'missing_date'], ['not-a-date', 'invalid_date'],
    ['2026-10-27', 'future_date'], ['2026-05-01', 'too_old'],
    ['2026-02-30T00:00:00Z', 'invalid_date'], ['2026-10-26T09:00:00', 'invalid_date'],
    ['10/11/2026', 'invalid_date'], ['2026-10-26T24:00:00Z', 'invalid_date'],
  ])('returns the bounded reason for %s', (date, reason) => {
    expect(assessFlashPublicationFreshness(date, policy)).toEqual({ eligible: false, reason })
  })

  it('handles DST offsets and valid leap days without normalizing impossible dates', () => {
    expect(flashPublicationTimestamp('2026-10-25T03:30:00+03:00'))
      .toBe(Date.parse('2026-10-25T00:30:00Z'))
    expect(flashPublicationTimestamp('2026-10-25T03:30:00+02:00'))
      .toBe(Date.parse('2026-10-25T01:30:00Z'))
    expect(flashPublicationTimestamp('2024-02-29')).toBe(Date.parse('2024-02-29T00:00:00Z'))
    for (const date of ['2026-02-29', '31 Feb 2026 10:00:00 GMT', '26 Oct 2026 10:00:00 +2460']) {
      expect(flashPublicationTimestamp(date)).toBeNull()
    }
  })

  it('allows only a shorter configured window, never zero, an unbounded archive or malformed input', () => {
    expect(parseFlashRssMaxAgeDays()).toBe(30)
    expect(parseFlashRssMaxAgeDays('7')).toBe(7)
    expect(assessFlashPublicationFreshness('2026-10-18', { now, maxAgeDays: 7 }).eligible).toBe(false)
    for (const value of ['0', '31', '-1', 'NaN', 'Infinity', '1.5', '3days', '', '--model']) {
      expect(() => parseFlashRssMaxAgeDays(value)).toThrow()
    }
    expect(() => assessFlashPublicationFreshness('2026-10-26', { now: NaN })).toThrow()
    expect(() => assessFlashPublicationFreshness('2026-10-26', { now, maxAgeDays: 100 })).toThrow()
  })

  it('preserves invalid raw RSS dates rather than trusting a parser-normalized rollover', async () => {
    const result = await parseFlashRssCandidates(plan, '<rss/>', { parseFeed: async () => ({ items: [
      { title: 'Invalid', link: 'https://research.google/invalid', pubDate: '31 Feb 2026 10:00:00 GMT', isoDate: '2026-03-03T10:00:00Z' },
      { title: 'Recent', link: 'https://research.google/recent', pubDate: 'Mon, 26 Oct 2026 08:00:00 GMT' },
      { title: 'Undated', link: 'https://research.google/undated' },
    ] }) })
    const filtered = filterFlashRssFreshCandidates(result.candidates, policy)
    expect(filtered.candidates.map(c => c.title)).toEqual(['Recent'])
    expect(filtered.rejected).toEqual({ too_old: 0, future_date: 0, missing_date: 1, invalid_date: 1 })
    expect(result.candidates[0]).toMatchObject({ publishedAt: null, publicationDateInvalid: true })
  })

  it('makes zero generation attempts when every candidate is stale or undated', async () => {
    const input = [{ publishedAt: '2026-05-01', url: 'old' }, { publishedAt: null, url: 'unknown' }]
    const snapshot = structuredClone(input)
    const filtered = filterFlashRssFreshCandidates(input, policy)
    const processCandidate = vi.fn(async () => 'complete' as const)
    expect(await runFlashRssStageNextAttempts({ candidates: filtered.candidates, maxAttempts: 3, processCandidate }))
      .toEqual({ completed: false, attemptedCount: 0 })
    expect(processCandidate).not.toHaveBeenCalled()
    expect(input).toEqual(snapshot)
  })

  it('filters before allocating maxAttempts and retains only fresh candidates in their original order', async () => {
    const input = [
      { publishedAt: '2026-05-01', id: 1 }, { publishedAt: null, id: 2 },
      { publishedAt: '2026-10-25', id: 3 }, { publishedAt: '2026-10-24', id: 4 },
    ]
    const filtered = filterFlashRssFreshCandidates(input, policy)
    const processCandidate = vi.fn(async () => 'skip' as const)
    await runFlashRssStageNextAttempts({ candidates: filtered.candidates, maxAttempts: 3, processCandidate })
    expect(processCandidate.mock.calls.map(([candidate]) => candidate.id)).toEqual([3, 4])
  })

  it('retains bounded date counters and the policy in the existing audit record', async () => {
    const update = vi.fn()
    const audit = new FlashRssRunDiagnostics(() => {}, () => now)
    await audit.start({ create: vi.fn().mockResolvedValue({ id: 1 }), update } as never, 'test', 'sha')
    audit.freshness(policy, { rejected: { too_old: 7, missing_date: 2, invalid_date: 1, future_date: 1 } })
    audit.result('empty')
    await audit.finish()
    expect(update.mock.lastCall?.[0].data).toMatchObject({ status: 'completed', evidenceSummary: {
      freshnessMaxAgeDays: 30, freshnessReferenceUtc: '2026-10-26T09:00:00.000Z',
      filteredStaleDateCount: 7, filteredMissingDateCount: 2, filteredInvalidDateCount: 1,
      filteredFutureDateCount: 1, attemptedCount: 0, outcome: 'empty',
    } })
  })

  it('wires both date gates before provider requests, without enabling freshness for standalone manual preparation', async () => {
    const runner = await readFile('scripts/flash-rss-stage-next.ts', 'utf8')
    const child = await readFile('scripts/flash-html-article-prepersistence-dedup-preview.ts', 'utf8')
    expect(runner.indexOf('filterFlashRssFreshCandidates(eligibleBeforeDailyBudget')).toBeLessThan(runner.indexOf('const dailyBudgetResult'))
    expect(runner).toContain("'--rss-freshness-now', new Date(freshnessPolicy.now).toISOString()")
    expect(child).toContain('let rssFreshnessPolicy: { now: number; maxAgeDays: number } | null = null')
    expect(child.indexOf('assessFlashPublicationFreshness(normalized.sourcePublicationDate')).toBeLessThan(child.indexOf('const classificationProducer ='))
    expect(runner).toContain('article_publication_not_current')
  })
})
