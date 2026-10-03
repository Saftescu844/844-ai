import { describe, expect, it } from 'vitest'
import { Surse } from '../../src/collections/Surse'
import { validateSourceDiscoveryConfiguration as validate } from '../../src/lib/flash/ingestion/sourceDiscoveryConfiguration'

const rss = {
  url: 'https://openai.com/', discoveryMethod: 'rss' as const,
  feedRSS: 'https://openai.com/news/rss.xml',
}

describe('source discovery configuration', () => {
  it('keeps legacy sources editable without enabling discovery', () => {
    expect(validate({ url: 'https://example.com/' })).toEqual([])
  })
  it('accepts a same-host RSS feed with defaults', () => {
    expect(validate(rss)).toEqual([])
    expect(validate({ ...rss, feedRSS: 'https://www.openai.com/news/rss.xml' })).toEqual([])
  })
  it('requires the canonical RSS field even when an HTML URL exists', () => {
    expect(validate({ ...rss, feedRSS: null, discoveryUrl: rss.feedRSS })).toEqual([
      expect.objectContaining({ path: 'feedRSS' }),
    ])
  })
  it.each([
    'https://evil.example/news/rss.xml',
    'https://openai.com.evil.example/rss',
    'https://user:password@openai.com/rss',
    'http://openai.com/rss',
    'https://openai.com/rss#fragment',
  ])('rejects a mismatched or unsafe endpoint: %s', feedRSS => {
    expect(validate({ ...rss, feedRSS }).some(issue => issue.path === 'feedRSS')).toBe(true)
  })
  it('requires the listing URL for HTML and editorial research', () => {
    for (const discoveryMethod of ['html', 'research'] as const) {
      expect(validate({ ...rss, discoveryMethod }).some(issue => issue.path === 'discoveryUrl')).toBe(true)
      expect(validate({ ...rss, discoveryMethod, discoveryUrl: 'https://openai.com/news/' })).toEqual([])
    }
  })
  it.each([
    { scanIntervalMinutes: 0 }, { scanIntervalMinutes: 59 },
    { scanIntervalMinutes: 60.5 }, { scanIntervalMinutes: null },
    { maxCandidatesPerScan: 21 }, { maxCandidatesPerScan: NaN },
    { maxCandidatesPerDay: 0 }, { maxCandidatesPerDay: Infinity },
  ])('rejects invalid limits: %j', limits => {
    expect(validate({ ...rss, ...limits }).length).toBeGreaterThan(0)
  })
  it('validates partial updates against the original method and URL', () => {
    const hook = Surse.hooks!.beforeValidate![0]
    expect(() => hook({ originalDoc: rss, data: { feedRSS: 'https://elsewhere.example/rss' } } as never)).toThrow()
    const data = { discoveryNotes: 'Own announcements only.' }
    expect(hook({ originalDoc: rss, data } as never)).toBe(data)
  })
})
