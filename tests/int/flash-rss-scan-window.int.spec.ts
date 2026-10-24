// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  assessFlashRssIngestionSource,
  parseFlashRssCandidates,
  limitFlashRssEligibleCandidates,
} from '@/lib/flash/ingestion/rssCandidateIngestion'
import type { Surse } from '@/payload-types'

const plan = (id = 5) => assessFlashRssIngestionSource({
  id, nume: 'Research', url: 'https://example.org/',
  feedRSS: 'https://example.org/rss', sourceRole: 'primary',
  editorialTrust: 'high', citationMode: 'paraphrase', allowAutoPublish: false,
  maxCandidatesPerScan: 10, maxCandidatesPerDay: 40,
} as Surse)

async function parse(id = 5) {
  return parseFlashRssCandidates(plan(id), '<feed/>', {
    maxItems: 50,
    scanBeforeEligibility: true,
    parseFeed: async () => ({ items: Array.from({ length: 60 }, (_, i) => ({
      title: `Item ${i + 1}`, link: `https://example.org/${id}/${i + 1}`,
    })) }),
  })
}

describe('bounded RSS scan before eligibility limits', () => {
  it('reaches an unseen item after the first 16 known or rejected URLs', async () => {
    const parsed = await parse()
    const existing = new Set(parsed.candidates.slice(0, 10).map(item => item.concreteUrl))
    const rejected = new Set(parsed.candidates.slice(10, 16).map(item => item.concreteUrl))
    const eligible = parsed.candidates.filter(item =>
      !existing.has(item.concreteUrl) && !rejected.has(item.concreteUrl))
    const result = limitFlashRssEligibleCandidates(eligible, [plan()], 10)
    expect(parsed.totalItems).toBe(50)
    expect(result.candidates).toHaveLength(10)
    expect(result.candidates[0].concreteUrl).toBe('https://example.org/5/17')
    expect(result.filteredCount).toBe(24)
    expect(result.candidates.some(item => existing.has(item.concreteUrl) || rejected.has(item.concreteUrl))).toBe(false)
  })

  it('retains per-source limits and permits a lower operator limit', async () => {
    const [a, b] = await Promise.all([parse(5), parse(6)])
    const result = limitFlashRssEligibleCandidates([...a.candidates, ...b.candidates],
      [plan(5), { ...plan(6), maxCandidatesPerScan: 2 }], 3)
    expect(result.candidates.filter(item => item.sourceId === 5)).toHaveLength(3)
    expect(result.candidates.filter(item => item.sourceId === 6)).toHaveLength(2)
  })

  it('returns empty when the entire bounded window is known', async () => {
    const parsed = await parse()
    const known = new Set(parsed.candidates.map(item => item.concreteUrl))
    expect(limitFlashRssEligibleCandidates(parsed.candidates.filter(item => !known.has(item.concreteUrl)),
      [plan()], 10).candidates).toEqual([])
    expect(parsed.candidates.some(item => item.concreteUrl.endsWith('/51'))).toBe(false)
  })
})
