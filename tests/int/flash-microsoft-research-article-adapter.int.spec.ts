// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { extractFlashHtmlArticle } from '@/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import { microsoftResearchArticleUrl } from '@/lib/flash/ingestion/microsoftResearchArticleAdapter'
import { assessFlashRssIngestionSource, parseFlashRssCandidates } from '@/lib/flash/ingestion/rssCandidateIngestion'
import { isFlashRssArticleUnsupportedLayoutFailure } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'
import { evaluateExplicitGroundedEventIdentity } from '@/lib/flash/ingestion/explicitGroundedEventIdentity'

const source = { id: 10, nume: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/',
  feedRSS: 'https://www.microsoft.com/en-us/research/feed/', sourceRole: 'primary' as const,
  editorialTrust: 'standard' as const, citationMode: 'paraphrase' as const, allowAutoPublish: false }
const url = `${source.url}blog/example-study/`
const article = `<html lang="en-US"><head><link rel="canonical" href="${url}"></head><body>
<nav><p>Navigation</p></nav><main itemscope itemtype="https://schema.org/BlogPosting">
<h1 itemprop="headline">A research simulation</h1><time itemprop="datePublished" datetime="2026-10-12T23:00:00-07:00">October 12, 2026</time>
<time itemprop="dateModified">October 20, 2026</time><p>Author biography</p>
<div class="single-post__content block-content content-container" itemprop="articleBody">
<div><p>Research findings, attributed to their authors.</p></div><p>Study limitations.</p>
<ul><li>First point.</li><li><p>Second point.</p></li></ul>
<div class="msr-promo"><p>Podcast promotion</p></div><figure><figcaption>Image caption</figcaption></figure>
<p hidden>Hidden text</p><p aria-hidden="true">Hidden aria</p><pre><code>Code sample</code></pre>
<p>Read the <a href="${source.url}publication/example-study/">paper</a>.</p>
<span class="sr-only">Opens in a new tab</span></div></main><footer>Footer</footer></body></html>`
const extract = (html = article) => extractFlashHtmlArticle(source.url, url, html)

describe('Microsoft Research scoped RSS and article extraction', () => {
  it('keeps original visible date, English article body and review-only normalization', () => {
    const result = extract()
    expect(result).toMatchObject({ sourceAdapter: 'microsoft-research', publicationDate: 'October 12, 2026',
      lead: 'Research findings, attributed to their authors.', finalUrl: url, primaryEvidenceUrls: [] })
    expect(result.bodyParagraphs).toEqual(['Research findings, attributed to their authors.', 'Study limitations.', 'First point.', 'Second point.', 'Read the paper.'])
    expect(result.bodyText).not.toMatch(/Navigation|Author biography|promotion|caption|Hidden|Code sample|Opens|Footer/)
    const normalized = normalizeFlashHtmlArticleCandidate({ sourceId: source.id, sourceName: source.nume,
      registeredSourceUrl: source.url, ...source }, result)
    expect(normalized).toMatchObject({ sourcePublicationDate: '2026-10-12', allowAutoPublish: false })
    // An internal publication page does not establish a DOI/arXiv identity.
    expect(evaluateExplicitGroundedEventIdentity(normalized).status).not.toBe('grounded')
  })
  it.each([
    'http://www.microsoft.com/en-us/research/blog/example/', 'https://microsoft.com.evil.test/en-us/research/blog/example/',
    'https://research.microsoft.com/en-us/research/blog/example/', 'https://user@www.microsoft.com/en-us/research/blog/example/',
    'https://www.microsoft.com:444/en-us/research/blog/example/', 'https://www.microsoft.com/fr-fr/research/blog/example/',
    `${source.url}podcast/example/`, `${source.url}publication/example/`, `${source.url}blog/`,
    'https://www.microsoft.com/en-us/windows/blog/example/',
  ])('rejects URLs outside the English Research blog: %s', value => {
    expect(() => microsoftResearchArticleUrl(source.url, value)).toThrow()
  })
  it('requires a scoped source registration and normalizes only tracking/host aliases', () => {
    expect(() => microsoftResearchArticleUrl('https://www.microsoft.com/', url)).toThrow()
    expect(microsoftResearchArticleUrl(source.url, url.replace('www.', '').replace(/\/$/, '?tracking=1#heading'))).toBe(url)
  })
  it.each([
    article.replace('lang="en-US"', 'lang="fr"'), article.replace('datePublished', 'dateModified'),
    article.replace('October 12, 2026', 'February 31, 2026'), article.replace('2026-10-12T23', '2026-10-13T23'),
    article.replace('2026-10-12T23:00:00-07:00', 'invalid'), article.replace('itemprop="articleBody"', 'itemprop="other"'),
    article.replace('https://schema.org/BlogPosting', 'https://schema.org/PodcastEpisode'),
    article.replace(`href="${url}"`, `href="${source.url}blog/other/"`),
    article.replace('</main>', '<div class="single-post__content" itemprop="articleBody"><p>Other</p></div></main>'),
  ])('rejects missing or conflicting article provenance', html => expect(() => extract(html)).toThrow())
  it('filters mixed RSS paths before attempt allocation, preserving feed dates', async () => {
    const links = [`${source.url}podcast/podcast/`, url, `${source.url}publication/paper/`,
      'https://www.microsoft.com/en-us/windows/blog/example/', `${source.url}blog/second-article/`]
    const xml = `<rss version="2.0"><channel><title>Microsoft Research</title>${links.map((link, i) =>
      `<item><title>Item ${i}</title><link>${link}</link><pubDate>Mon, 12 Oct 2026 16:00:00 GMT</pubDate></item>`).join('')}</channel></rss>`
    const parsed = await parseFlashRssCandidates(assessFlashRssIngestionSource(source), xml, { scanBeforeEligibility: true, maxItems: 50 })
    expect(parsed).toMatchObject({ totalItems: 5, skippedItems: 3 })
    expect(parsed.candidates.map(c => c.concreteUrl)).toEqual([url, `${source.url}blog/second-article/`])
    expect(parsed.candidates[0]?.publishedAt).toBe('2026-10-12T16:00:00.000Z')
  })
  it('only allows bounded layout skips, leaving date and canonical conflicts fail closed', () => {
    expect(isFlashRssArticleUnsupportedLayoutFailure('FLASH_MICROSOFT_RESEARCH_ARTICLE_LAYOUT_UNSUPPORTED: article body')).toBe(true)
    expect(isFlashRssArticleUnsupportedLayoutFailure('FLASH_MICROSOFT_RESEARCH_ARTICLE_LAYOUT_UNSUPPORTED: arbitrary text')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('Microsoft Research canonical URL does not match the retrieved article.')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('Microsoft Research publication date attributes conflict with the visible original date.')).toBe(false)
  })
})
