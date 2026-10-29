// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { assessFlashPublicationFreshness, filterFlashRssFreshCandidates, flashPublicationTimestamp, parseFlashRssMaxAgeDays } from '@/lib/flash/ingestion/flashPublicationFreshness'
import { parseFlashRssCandidates, type FlashRssIngestionSourcePlan } from '@/lib/flash/ingestion/rssCandidateIngestion'

const now = Date.parse('2026-10-26T09:00:00Z')
const policy = { now, maxAgeDays: 30 }
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

  it('rejects an invalid original RSS date even if the parser supplied a normalized ISO date', async () => {
    const plan: FlashRssIngestionSourcePlan = {
      sourceId: 5, sourceName: 'Google', registeredSourceUrl: 'https://research.google/',
      feedUrl: 'https://research.google/blog/rss/', sourceRole: 'primary', editorialTrust: 'high',
      citationMode: 'direct', allowAutoPublish: false, candidateSkipMemory: [], ready: true, blocker: null,
    }
    const result = await parseFlashRssCandidates(plan, '<rss/>', { parseFeed: async () => ({ items: [
      { title: 'Malformed', link: 'https://research.google/blog/malformed/', pubDate: '31 Feb 2026 10:00:00 GMT', isoDate: '2026-03-03T10:00:00Z' },
      { title: 'Recent', link: 'https://research.google/blog/recent/', pubDate: 'Mon, 26 Oct 2026 08:00:00 GMT' },
      { title: 'Missing', link: 'https://research.google/blog/missing/' },
      { title: 'Old', link: 'https://research.google/blog/old/', pubDate: 'Tue, 01 Sep 2026 08:00:00 GMT' },
    ] }) })
    const filtered = filterFlashRssFreshCandidates(result.candidates, policy)
    expect(filtered.candidates.map(c => c.title)).toEqual(['Recent'])
    expect(filtered.rejected).toEqual({ too_old: 1, future_date: 0, missing_date: 1, invalid_date: 1 })
    expect(result.candidates[0]).toMatchObject({ publishedAt: null, publicationDateInvalid: true })
  })
})
