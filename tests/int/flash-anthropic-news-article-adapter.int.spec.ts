// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Surse } from '@/payload-types'
import { assessInstitutionalHtmlSource, parseInstitutionalHtmlCandidates } from '@/lib/flash/ingestion/institutionalHtmlDiscovery'
import { extractFlashHtmlArticle } from '@/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import { anthropicNewsArticleUrl, normalizeAnthropicPublicationDate } from '@/lib/flash/ingestion/anthropicNewsArticleAdapter'
import { filterFlashRssFreshCandidates } from '@/lib/flash/ingestion/flashPublicationFreshness'
import { isFlashRssArticleUnsupportedLayoutFailure } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'

const source = { id: 9, nume: 'Anthropic News', url: 'https://www.anthropic.com/', discoveryMethod: 'html',
  discoveryUrl: 'https://www.anthropic.com/news', sourceRole: 'primary', editorialTrust: 'standard',
  citationMode: 'paraphrase', allowAutoPublish: false } as Surse
const url = 'https://www.anthropic.com/news/example-news'
const row = (slug = 'example-news', date = 'Oct 26, 2026') => `<div class="TableView-module-scss-module__hash__summary">
<a class="TableView-module-scss-module__hash__title-link" href="/news/${slug}">Original title</a>
<a href="/news/announcements">Announcements</a><div class="TableView-module-scss-module__hash__date">${date}</div></div>`
const listing = (content: string) => `<html lang="en"><main>${content}</main></html>`
const article = `<html lang="en"><head><link rel="canonical" href="${url}"><meta name="description" content="Generic corporate marketing."></head>
<body><nav><p>Navigation</p></nav><main><article class="ArticlePage-module-scss-module__hash__Article">
<h1 class="ArticleHero-module-scss-module__hash__Title">Original title</h1>
<li class="ArticleHero-module-scss-module__hash__Metadata"><p>Published</p><p><time datetime="2026-10-26">Oct 26, 2026</time></p></li>
<li class="ArticleHero-module-scss-module__hash__Metadata"><p>Updated</p><time datetime="2026-10-27">Oct 27, 2026</time></li>
<div data-article-body="true"><p>Original factual opening.</p><p>Body with <strong>source evidence</strong>.</p><ul><li>First point.</li><li><p>Second point.</p></li></ul>
<aside><p>Related marketing</p></aside><p hidden>Hidden text</p><pre><code>Code sample</code></pre><script>Injected script</script></div>
<section><p>Outside article body</p><time>Nov 1, 2026</time></section></article></main><footer>Footer</footer></body></html>`
const extract = (html = article) => extractFlashHtmlArticle(source.url, url, html)

describe('Anthropic news in the existing ingestion pipeline', () => {
  it('discovers dated title links only, excluding categories, hidden expanders, navigation and duplicates', () => {
    const plan = assessInstitutionalHtmlSource(source)
    expect(plan.ready).toBe(true)
    const alias = row().replace('/news/example-news', 'https://anthropic.com/news/example-news/?tracking=1#section')
    const html = listing(`<nav>${row('navigation')}</nav>${row()}${row()}${alias}<div aria-hidden="true">${row('hidden')}</div>`)
    const candidates = parseInstitutionalHtmlCandidates(plan, html)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({ concreteUrl: url, publishedAt: '2026-10-26T00:00:00.000Z' })
  })
  it('preserves existing freshness reasons for old, missing, invalid and future dates', () => {
    const candidates = parseInstitutionalHtmlCandidates(assessInstitutionalHtmlSource(source), listing(
      row('old', 'Aug 1, 2026') + row('missing', '') + row('invalid', 'Feb 31, 2026') + row('future', 'Nov 1, 2026')))
    const result = filterFlashRssFreshCandidates(candidates, { now: Date.parse('2026-10-26T20:00:00Z') })
    expect(result.candidates).toHaveLength(0)
    expect(result.rejected).toEqual({ too_old: 1, missing_date: 1, invalid_date: 1, future_date: 1 })
  })
  it('bounds listing inspection to 50 summary rows', () => {
    const rows = Array.from({ length: 60 }, (_, i) => row(`news-${i}`)).join('')
    expect(parseInstitutionalHtmlCandidates(assessInstitutionalHtmlSource(source), listing(rows))).toHaveLength(50)
  })
  it('keeps the visible Published date and body through canonical normalization', () => {
    const result = extract()
    expect(result).toMatchObject({ publicationDate: 'Oct 26, 2026', sourceAdapter: 'anthropic-news',
      lead: 'Original factual opening.', primaryEvidenceUrls: [] })
    expect(result.bodyParagraphs).toEqual(['Original factual opening.', 'Body with source evidence.', 'First point.', 'Second point.'])
    expect(result.bodyText).not.toMatch(/marketing|Hidden|Code sample|Injected|Outside|Navigation|Footer/)
    expect(normalizeFlashHtmlArticleCandidate({ sourceId: 9, sourceName: source.nume, registeredSourceUrl: source.url,
      sourceRole: source.sourceRole, editorialTrust: source.editorialTrust, citationMode: source.citationMode,
      allowAutoPublish: false }, result)).toMatchObject({ sourcePublicationDate: '2026-10-26', allowAutoPublish: false })
  })
  it.each([
    article.replace('lang="en"', 'lang="fr"'), article.replace('>Published<', '>Updated<'),
    article.replace('Oct 26, 2026', 'Feb 31, 2026'), article.replace('datetime="2026-10-26"', 'datetime="2026-10-25"'),
    article.replace('data-article-body="true"', 'data-changed-body="true"'),
    article.replace('</article>', '<div data-article-body="true"><p>Other</p></div></article>'),
    article.replace('href="'+url+'"', 'href="https://other.test/news/example-news"'),
    article.replace('href="'+url+'"', 'href="https://www.anthropic.com/news/different-news"'),
  ])('rejects missing, conflicting or ambiguous article provenance', html => expect(() => extract(html)).toThrow())
  it.each(['http://www.anthropic.com/news/example', 'https://anthropic.com.evil.test/news/example',
    'https://api.anthropic.com/news/example', 'https://user@www.anthropic.com/news/example',
    'https://www.anthropic.com:444/news/example', 'https://www.anthropic.com/fr/news/example',
    'https://www.anthropic.com/news'])('rejects unsupported URLs: %s', value => {
    expect(() => anthropicNewsArticleUrl(source.url, value)).toThrow()
  })
  it('recognizes only bounded structural skip markers, leaving unknown failures unhandled', () => {
    let error: unknown
    try { extract(article.replace('data-article-body="true"', 'data-custom="true"')) } catch (e) { error = e }
    expect(error).toBeInstanceOf(Error)
    expect(isFlashRssArticleUnsupportedLayoutFailure((error as Error).message)).toBe(true)
    expect(isFlashRssArticleUnsupportedLayoutFailure('FLASH_ANTHROPIC_ARTICLE_LAYOUT_UNSUPPORTED: arbitrary text')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('Anthropic canonical URL does not match the retrieved article.')).toBe(false)
  })
  it.each(['Oct 26, 2026', 'October 26, 2026'])('normalizes observed English dates: %s', date => {
    expect(normalizeAnthropicPublicationDate(date)).toBe('2026-10-26')
  })
})
