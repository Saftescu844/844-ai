import { describe, expect, it } from 'vitest'
import { extractFlashHtmlArticle } from '../../src/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '../../src/lib/flash/ingestion/articleCandidateNormalization'
import type { FlashHtmlListingSource } from '../../src/lib/flash/ingestion/htmlListingCandidateIngestion'
import { evaluateExplicitGroundedEventIdentity } from '../../src/lib/flash/ingestion/explicitGroundedEventIdentity'

const googleUrl = 'https://research.google/blog/learning-interactives/'
const mitUrl = 'https://news.mit.edu/2026/instructmesh-1001'
// Synthetic fixtures model the observed source structure without copying article bodies.
const google = `<!doctype html><html lang="en"><head></head><body>
<nav><p>Navigation</p></nav><main id="page-content"><h1>Learning &amp; practice</h1>
<div class="basic-hero--blog-detail__description"><p>September 17, 2026</p><p>Authors</p></div>
<div class="blog-summary__summary"><p>A teacher-facing research prototype.</p></div>
<div class="quick-links"><a href="https://arxiv.org/abs/2609.20738v2?utm_source=test#paper">Tech report</a></div>
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
<p class="article-links">Paper: <a href="https://arxiv.org/abs/2608.28534">paper</a></p>
</article></main><article class="news-article--recent-news--teaser"><p>Unrelated news</p></article></body></html>`
function source(url: string): FlashHtmlListingSource {
  return { sourceId: 5, sourceName: 'Test source', registeredSourceUrl: new URL(url).origin,
    sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase', allowAutoPublish: false }
}
function extract(url: string, html: string) {
  return extractFlashHtmlArticle(new URL(url).origin, url, html)
}

describe('Explicit Google primary research references', () => {
  it('recognizes the observed This research label and keeps unrelated citations secondary', () => {
    const html = google.replace('>Tech report</a>', '>This research</a>')
      .replace('</main>', '<p><a href="https://arxiv.org/abs/1811.03604">prior work</a></p></main>')
    expect(extract(googleUrl, html).primaryEvidenceUrls).toEqual(['https://arxiv.org/abs/2609.20738'])
  })

  it('does not accept primary-label links outside the article main container', () => {
    const html = google.replace('>Tech report</a>', '>prior work</a>')
      .replace('<footer>', '<footer><a href="https://arxiv.org/abs/2606.03979">This research</a>')
    expect(extract(googleUrl, html).primaryEvidenceUrls).toEqual([])
  })

  it('refuses two distinct primary papers rather than choosing one', () => {
    const html = google.replace('</main>', '<p><a href="https://arxiv.org/abs/2606.03979">This research</a></p></main>')
    expect(() => extract(googleUrl, html)).toThrow('multiple primary arXiv')
  })

  it.each(['https://arxiv.org.evil.example/abs/2606.03979', 'http://user:pass@arxiv.org/abs/2606.03979', 'http://arxiv.org:444/abs/2606.03979', 'https://arxiv.org:80/abs/2606.03979', 'ftp://arxiv.org/abs/2606.03979', 'http://localhost/abs/2606.03979', 'http://arxiv.org/pdf/2606.03979', 'http://arxiv.org/abs/not-an-id'])('keeps unsafe or unsupported evidence URL rejected: %s', url => {
    const html = google.replace('https://arxiv.org/abs/2609.20738v2?utm_source=test#paper', url)
      .replace('>Tech report</a>', '>This research</a>')
    expect(extract(googleUrl, html).primaryEvidenceUrls).toEqual([])
  })

  it('canonicalizes an explicitly labelled HTTP arXiv reference to HTTPS, without fetching it', () => {
    const html = google.replace('https://arxiv.org/abs/2609.20738v2?utm_source=test#paper', 'http://arxiv.org/abs/2609.20738v2?utm_source=test#paper')
    expect(extract(googleUrl, html).primaryEvidenceUrls).toEqual(['https://arxiv.org/abs/2609.20738'])
  })

  it('recovers the MIT X-Hinges HTTP-link shape and deduplicates its repeated primary reference', () => {
    const html = mit.replace('https://arxiv.org/abs/2608.28534', 'http://arxiv.org/abs/2609.11077')
      .replace('</article>', '<p><a href="https://arxiv.org/abs/2609.11077v1">Paper: X-Hinges</a></p></article>')
    const article = extract(mitUrl, html)
    expect(article.primaryEvidenceUrls).toEqual(['https://arxiv.org/abs/2609.11077'])
    expect(evaluateExplicitGroundedEventIdentity(normalizeFlashHtmlArticleCandidate(source(mitUrl), article))).toMatchObject({ status: 'grounded', identity: { authority: 'arxiv', stableId: '2609.11077' } })
  })

  it('does not promote a secondary HTTP reference and still rejects distinct primary papers', () => {
    const secondary = google.replace('https://arxiv.org/abs/2609.20738v2?utm_source=test#paper', 'http://arxiv.org/abs/2609.20738').replace('>Tech report</a>', '>prior work</a>')
    expect(extract(googleUrl, secondary).primaryEvidenceUrls).toEqual([])
    const ambiguous = mit.replace('https://arxiv.org/abs/2608.28534', 'http://arxiv.org/abs/2608.28534').replace('</article>', '<a href="https://arxiv.org/abs/2609.11077">Paper: Another study</a></article>')
    expect(() => extract(mitUrl, ambiguous)).toThrow('multiple primary arXiv')
  })
})

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
    expect(article.primaryEvidenceUrls).toEqual(['https://arxiv.org/abs/2609.20738'])
    expect(article.bodyText).toBe(article.bodyParagraphs.join('\n\n'))
  })
  it('accepts Google Paper as a primary arXiv label while ignoring secondary arXiv citations', () => {
    const paperGoogle = google
      .replace('>Tech report</a>', '>Paper</a>')
      .replace(
        '<p>A small <strong>pilot</strong> reports feedback &mdash; not proven learning gains.',
        '<p>A small <strong>pilot</strong> reports feedback &mdash; not proven learning gains. <a href="https://arxiv.org/abs/1811.03604">prior work</a>',
      )

    const article = extract(googleUrl, paperGoogle)

    expect(article.primaryEvidenceUrls).toEqual([
      'https://arxiv.org/abs/2609.20738',
    ])
  })

  it('isolates MIT body and preserves funding provenance and meta lead origin', () => {
    const article = extract(mitUrl, mit)
    expect(article.bodyParagraphs).toEqual(['A prototype edits 3D models.', 'Limitations remain.'])
    expect(article.provenanceParagraphs).toEqual(['The researchers’ work was supported, in part, by a grant.'])
    expect(article.lead).toBe('A model-editing research tool.')
    expect(article.leadKind).toBe('meta-description')
    expect(article.primaryEvidenceUrls).toEqual(['https://arxiv.org/abs/2608.28534'])
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
      expect(candidate.primaryEvidenceUrls).toEqual(article.primaryEvidenceUrls)
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
  it('fails closed when a source exposes multiple distinct primary arXiv evidence links', () => {
    const ambiguousGoogle = google.replace(
      '</div>\n<div class="blog-detail-wrapper">',
      '<a href="https://arxiv.org/abs/2609.99999">Tech report</a></div>\n<div class="blog-detail-wrapper">',
    )
    expect(() => extract(googleUrl, ambiguousGoogle)).toThrow('multiple primary arXiv evidence links')
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
