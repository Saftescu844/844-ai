import { describe, expect, it } from 'vitest'
import { extractFlashHtmlArticle } from '../../src/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '../../src/lib/flash/ingestion/articleCandidateNormalization'
import type { FlashHtmlListingSource } from '../../src/lib/flash/ingestion/htmlListingCandidateIngestion'

const googleUrl = 'https://research.google/blog/learning-interactives/'
const mitUrl = 'https://news.mit.edu/2026/instructmesh-1001'
// Synthetic fixtures model the observed source structure without copying article bodies.
const google = `<!doctype html><html lang="en"><head></head><body>
<nav><p>Navigation</p></nav><main id="page-content"><h1>Learning &amp; practice</h1>
<div class="basic-hero--blog-detail__description"><p>September 17, 2026</p><p>Authors</p></div>
<div class="blog-summary__summary"><p>A teacher-facing research prototype.</p></div>
<div class="blog-detail-wrapper"><div class="rich-text"><h2>Study</h2>
<p>A small <strong>pilot</strong> reports feedback &mdash; not proven learning gains.<script>throw Error('must not run')</script></p>
<div><p>Further evaluation is planned.<br>Results are preliminary.</p></div></div>
<div class="caption"><p>Image caption</p></div><figure><div class="rich-text"><p>Figure text</p></div></figure>
<div class="rich-text"><h2>Acknowledgements</h2><p>Thanks to the contributors.</p>
<h2>Next steps</h2><p>Another study is needed.</p>
<p hidden>Hidden text</p><p aria-hidden="true">Hidden accessibility text</p>
<aside><p>Recommendations</p></aside></div></div></main><footer><p>Footer</p></footer></body></html>`
const mit = `<!doctype html><html lang="en-US"><head><meta name="description" content="A model-editing research tool."></head><body>
<main><article><h1>A 3D tool</h1><time datetime="2026-10-01T22:00:00Z">October 1, 2026</time>
<div class="news-article--images-gallery--nav"><p>Gallery navigation</p></div>
<div class="news-article--content--body--inner"><div><p>A prototype edits <em>3D</em> models.</p>
<p>Limitations remain.</p><p>The researchers’ work was supported, in part, by a grant.</p></div></div>
</article></main><article class="news-article--recent-news--teaser"><p>Unrelated news</p></article></body></html>`
function source(url: string): FlashHtmlListingSource {
  return { sourceId: 5, sourceName: 'Test source', registeredSourceUrl: new URL(url).origin,
    sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase', allowAutoPublish: false }
}
function extract(url: string, html: string) {
  return extractFlashHtmlArticle(new URL(url).origin, url, html)
}

describe('Google Research and MIT article adapters', () => {
  it('isolates Google body, decodes entities and keeps acknowledgements separately', () => {
    const article = extract(googleUrl, google)
    expect(article.title).toBe('Learning & practice')
    expect(article.bodyParagraphs).toEqual([
      'A small pilot reports feedback — not proven learning gains.',
      'Further evaluation is planned. Results are preliminary.',
      'Another study is needed.',
    ])
    expect(article.provenanceParagraphs).toEqual(['Thanks to the contributors.'])
    expect(article.leadKind).toBe('article-summary')
    expect(article.bodyText).toBe(article.bodyParagraphs.join('\n\n'))
  })
  it('isolates MIT body and preserves funding provenance and meta lead origin', () => {
    const article = extract(mitUrl, mit)
    expect(article.bodyParagraphs).toEqual(['A prototype edits 3D models.', 'Limitations remain.'])
    expect(article.provenanceParagraphs).toEqual(['The researchers’ work was supported, in part, by a grant.'])
    expect(article.lead).toBe('A model-editing research tool.')
    expect(article.leadKind).toBe('meta-description')
  })
  it.each([[googleUrl, google, '2026-09-17'], [mitUrl, mit, '2026-10-01']])(
    'normalizes %s without changing source text or permissions', (url, html, date) => {
      const article = extract(`${url}?utm_source=test#body`, html)
      const candidate = normalizeFlashHtmlArticleCandidate(source(url), article)
      expect(candidate.canonicalUrl).toBe(url)
      expect(candidate.sourcePublicationDate).toBe(date)
      expect(candidate.sourcePublicationDateRaw).toBe(article.publicationDate)
      expect(candidate.bodyParagraphs).toEqual(article.bodyParagraphs)
      expect(candidate.provenanceParagraphs).toEqual(article.provenanceParagraphs)
      expect(candidate.allowAutoPublish).toBe(false)
      expect(candidate.language).toBe('en')
    },
  )
  it.each([
    ['https://research.google/', 'https://research.google.evil.example/blog/story/'],
    ['https://research.google/', 'https://news.mit.edu/2026/story-1001'],
    ['https://research.google/', 'http://research.google/blog/story/'],
    ['https://research.google/', 'https://user:pass@research.google/blog/story/'],
    ['https://research.google/', 'https://research.google:444/blog/story/'],
    ['https://research.google/', 'https://research.google/blog/'],
    ['https://research.google/', 'https://research.google/blog/rss/'],
    ['https://research.google/', 'https://research.google/blog/rss'],
    ['https://research.google/', 'https://research.google/blog/tag/education/'],
    ['https://news.mit.edu/', 'https://news.mit.edu/topic/artificial-intelligence'],
    ['https://news.mit.edu/', 'https://news.mit.edu/rss/topic/artificial-intelligence2'],
  ])('rejects unsupported URL %s -> %s', (base, url) => {
    expect(() => extractFlashHtmlArticle(base, url, google)).toThrow()
  })
  it('enforces registered host in downstream normalization too', () => {
    const article = extract(googleUrl, google)
    expect(() => normalizeFlashHtmlArticleCandidate(source(googleUrl), { ...article, finalUrl: mitUrl })).toThrow()
  })
  it.each([
    ['missing title', google.replace('<h1>Learning &amp; practice</h1>', '')],
    ['missing date', google.replace('September 17, 2026', 'Date unavailable')],
    ['invalid date', google.replace('September 17, 2026', 'February 30, 2026')],
    ['unknown month', google.replace('September 17, 2026', 'Sept 17, 2026')],
    ['ambiguous date', google.replace('<p>Authors</p>', '<p>October 1, 2026</p>')],
    ['changed layout', google.replace('blog-detail-wrapper', 'new-layout')],
    ['missing lead', google.replace('blog-summary__summary', 'new-summary')],
    ['wrong language', google.replace('lang="en"', 'lang="ro"')],
    ['missing language', google.replace('lang="en"', '')],
    ['empty body', google.replaceAll('rich-text', 'other-container')],
  ])('fails closed on %s', (_, html) => {
    expect(() => extract(googleUrl, html)).toThrow()
  })
  it('rejects invalid calendar dates if normalization is called directly', () => {
    const article = extract(mitUrl, mit)
    expect(() => normalizeFlashHtmlArticleCandidate(source(mitUrl), { ...article, publicationDate: 'February 29, 2025' })).toThrow()
    expect(normalizeFlashHtmlArticleCandidate(source(mitUrl), { ...article, publicationDate: 'February 29, 2024' }).sourcePublicationDate).toBe('2024-02-29')
  })
  it.each([
    mit.replace('name="description"', 'name="other"'),
    mit.replace('October 1, 2026', 'Unknown date'),
    mit.replace('news-article--content--body--inner', 'new-layout'),
    mit.replace('<h1>A 3D tool</h1>', '<h1>One</h1><h1>Two</h1>'),
  ])('rejects missing or ambiguous MIT metadata/body', html => {
    expect(() => extract(mitUrl, html)).toThrow()
  })
  it('rejects an adapter marker inconsistent with the source', () => {
    const article = extract(googleUrl, google)
    expect(() => normalizeFlashHtmlArticleCandidate(source(googleUrl), { ...article, sourceAdapter: 'mit-news' })).toThrow()
  })
  it('accepts the same normalized www host and strips fragments', () => {
    const article = extractFlashHtmlArticle('https://www.research.google/', `${googleUrl}#body`, google)
    expect(article.finalUrl).toBe(googleUrl)
  })
})
