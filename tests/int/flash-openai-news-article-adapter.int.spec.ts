// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { extractFlashHtmlArticle } from '@/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import { openAiNewsArticleUrl } from '@/lib/flash/ingestion/openAiNewsArticleAdapter'
import { isFlashRssArticleUnsupportedLayoutFailure, runFlashRssStageNextAttempts } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'

const source = 'https://openai.com/'
const url = 'https://openai.com/index/example-announcement/'
const fixture = `<html lang="en-US"><head><link rel="canonical" href="${url}"><meta name="description" content="Fallback summary."></head><body>
<nav><p>Navigation</p></nav><main><article>
<div data-article-hero-copy-region="meta"><p>October 26, 2026</p><a>Research</a></div>
<h1 data-article-hero-copy-region="headline">Example &amp; evidence</h1>
<p data-article-hero-copy-region="subhead">Original summary.</p>
<div data-toc-content><p>Source <strong>supported</strong> body.</p><ul><li>First detail.</li><li><p>Second detail.</p></li></ul>
<aside><p>Related marketing</p></aside><p hidden>Hidden text</p><p aria-hidden="true">Hidden text</p><pre><code>Code sample</code></pre><script>Injected code</script></div>
<section><p>Related article</p><time datetime="2026-10-27">October 27, 2026</time></section>
</article></main><footer><p>Footer</p></footer></body></html>`
const extract = (html = fixture) => extractFlashHtmlArticle(source, url, html)

describe('OpenAI standard article adapter', () => {
  it('skips a known custom hero and continues within the existing attempt limit', async () => {
    const processed: string[] = []
    const result = await runFlashRssStageNextAttempts({ candidates: ['custom', 'standard', 'unused'], maxAttempts: 2,
      processCandidate: async candidate => {
        processed.push(candidate)
        try { extract(candidate === 'custom' ? fixture.replace('data-article-hero-copy-region="meta"', 'data-custom') : fixture) }
        catch (error) {
          if (error instanceof Error && isFlashRssArticleUnsupportedLayoutFailure(error.message)) return 'skip'
          throw error
        }
        return 'complete'
      },
    })
    expect(result).toEqual({ completed: true, attemptedCount: 2 })
    expect(processed).toEqual(['custom', 'standard'])
    expect(isFlashRssArticleUnsupportedLayoutFailure('provider error: FLASH_OPENAI_ARTICLE_LAYOUT_UNSUPPORTED: headline')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('FLASH_OPENAI_ARTICLE_LAYOUT_UNSUPPORTED: arbitrary secret')).toBe(false)
  })
  it('uses the observed hero date and body rather than related-card dates or page UI', () => {
    const article = extract()
    expect(article).toMatchObject({ title: 'Example & evidence', publicationDate: 'October 26, 2026',
      sourceAdapter: 'openai-news', lead: 'Original summary.', leadKind: 'article-summary', primaryEvidenceUrls: [] })
    expect(article.bodyParagraphs).toEqual(['Source supported body.', 'First detail.', 'Second detail.'])
    expect(article.bodyText).not.toMatch(/Navigation|marketing|Hidden|Injected|Code sample|Related|Footer/)
    expect(normalizeFlashHtmlArticleCandidate({ sourceId: 7, sourceName: 'OpenAI News',
      registeredSourceUrl: source, sourceRole: 'primary', editorialTrust: 'standard',
      citationMode: 'paraphrase', allowAutoPublish: false }, article)).toMatchObject({
      sourcePublicationDate: '2026-10-26', sourceAdapter: 'openai-news', allowAutoPublish: false,
    })
  })
  it('keeps the original older date despite newer related cards', () => {
    expect(extract(fixture.replace('October 26, 2026', 'August 7, 2025')).publicationDate).toBe('August 7, 2025')
  })
  it('uses an explicitly marked description only when the article has no subhead', () => {
    const article = extract(fixture.replace('<p data-article-hero-copy-region="subhead">Original summary.</p>', ''))
    expect(article).toMatchObject({ lead: 'Fallback summary.', leadKind: 'meta-description' })
  })
  it.each([
    fixture.replace('en-US', 'fr-FR'),
    fixture.replace('October 26, 2026', 'February 31, 2026'),
    fixture.replace('data-article-hero-copy-region="meta"', 'data-modified-date'),
    fixture.replace('data-article-hero-copy-region="headline"', 'data-custom-hero'),
    fixture.replace('data-toc-content', 'data-custom-body'),
    fixture.replace('</article>', '<div data-toc-content><p>Other body</p></div></article>'),
    fixture.replace('</article>', '<div data-article-hero-copy-region="meta"><p>October 25, 2026</p></div></article>'),
    fixture.replace('href="'+url+'"', 'href="https://other.test/index/example-announcement/"'),
    fixture.replace('href="'+url+'"', 'href="https://openai.com/index/another-page/"'),
  ])('rejects unsupported or ambiguous original article structure', html => {
    expect(() => extract(html)).toThrow()
  })
  it.each(['http://openai.com/index/example/', 'https://openai.com.evil.test/index/example/',
    'https://api.openai.com/index/example/', 'https://user@openai.com/index/example/',
    'https://openai.com:444/index/example/', 'https://openai.com/fr-FR/index/example/',
    'https://openai.com/news/rss.xml', 'https://openai.com/index/'])('rejects unsupported article URLs: %s', value => {
    expect(() => openAiNewsArticleUrl(source, value)).toThrow()
  })
})
