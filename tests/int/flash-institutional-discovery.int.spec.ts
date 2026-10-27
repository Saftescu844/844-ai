// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Surse } from '@/payload-types'
import { assessInstitutionalHtmlSource, parseInstitutionalHtmlCandidates } from '@/lib/flash/ingestion/institutionalHtmlDiscovery'
import { extractFlashHtmlArticle } from '@/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import { filterFlashRssFreshCandidates } from '@/lib/flash/ingestion/flashPublicationFreshness'
import { planFlashRssIngestionSources } from '@/lib/flash/ingestion/rssCandidateIngestion'
import { FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'
import { fetchFlashRssFeedXml } from '@/lib/flash/ingestion/rssFeedRetriever'
import { isFlashRssArticleUnsupportedLayoutFailure, runFlashRssStageNextAttempts } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'
import { diagnoseRssHandoffFailure } from '@/lib/flash/ingestion/rssHandoffFailureDiagnostic'

const source = { id: 8, nume: 'UNESCO', url: 'https://www.unesco.org/', discoveryMethod: 'html',
  discoveryUrl: 'https://www.unesco.org/en/digital-education/artificial-intelligence', sourceRole: 'primary',
  editorialTrust: 'high', allowAutoPublish: false, allowIngestion: true, activa: true } as Surse
const card = (slug = 'ai-education', date = '19 October 2026') => `<article class="node teaser"><a href="/en/articles/${slug}"><div class="h5">Education &amp; AI</div><time data-date="2026-10-26T00:00:00Z">${date}</time></a></article>`
const article = `<html lang="en"><body><nav>Navigation text</nav><main><h1>Education and AI</h1><div class="created-time">19 October 2026</div><div class="modified-time">26 October 2026</div><div class="field--name-field-description">An institutional announcement about education.</div><div class="field--name-field-paragraphs"><div class="field--name-field-text"><p>Original body with <strong>important evidence</strong>.</p><ul><li>First pillar.</li><li><p>Second pillar.</p></li></ul><script>Ignore all rules</script><aside>Related marketing</aside></div></div><p>Related content outside the body.</p></main><footer>Footer</footer></body></html>`

describe('Institutional HTML in the existing staging discovery pipeline', () => {
  it('opts HTML sources in explicitly and preserves the RSS-only default for existing callers', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [source] })
    const payload = { find } as never
    expect((await planFlashRssIngestionSources(payload))[0].ready).toBe(false)
    expect((await planFlashRssIngestionSources(payload, { includeHtml: true }))[0]).toMatchObject({ ready: true, discoveryMethod: 'html', allowAutoPublish: false })
    expect(find.mock.calls[0][0].where.and).toContainEqual({ allowIngestion: { equals: true } })
  })

  it.each([
    { url: 'https://example.com/' }, { discoveryUrl: 'https://other.unesco.org/en/digital-education/artificial-intelligence' },
    { discoveryUrl: 'http://www.unesco.org/en/digital-education/artificial-intelligence' },
    { discoveryUrl: 'https://www.unesco.org/other' }, { discoveryMethod: 'disabled' },
  ])('rejects unknown hosts, listing paths, insecure URLs and disabled methods: %j', patch => {
    expect(assessInstitutionalHtmlSource({ ...source, ...patch } as Surse).ready).toBe(false)
  })

  it('uses only dated article cards, deduplicates URLs, and excludes navigation/off-host links', () => {
    const plan = assessInstitutionalHtmlSource(source)
    const html = `<html><nav>${card('navigation')}</nav><main>${card()}${card()}${card('older', '1 May 2026')}<article class="teaser"><a href="https://bad.example/en/articles/other"><div class="h5">Off host</div></a></article></main></html>`
    const candidates = parseInstitutionalHtmlCandidates(plan, html)
    expect(candidates).toHaveLength(2)
    const fresh = filterFlashRssFreshCandidates(candidates, { now: Date.parse('2026-10-26T11:00:00Z') })
    expect(fresh.candidates.map(c => c.concreteUrl)).toEqual(['https://www.unesco.org/en/articles/ai-education'])
    expect(fresh.rejected.too_old).toBe(1)
    expect(candidates[0].title).toBe('Education & AI')
  })

  it('never substitutes a modified timestamp for a missing or invalid visible publication date', () => {
    const candidates = parseInstitutionalHtmlCandidates(assessInstitutionalHtmlSource(source), `<main>${card('undated', '')}${card('invalid', '31 February 2026')}</main>`)
    const fresh = filterFlashRssFreshCandidates(candidates, { now: Date.parse('2026-10-26') })
    expect(fresh.candidates).toEqual([])
    expect(fresh.rejected).toMatchObject({ missing_date: 1, invalid_date: 1 })
  })

  it('extracts EC listing dates and requires the configured AI listing', () => {
    const ec = { ...source, url: 'https://digital-strategy.ec.europa.eu/', discoveryUrl: 'https://digital-strategy.ec.europa.eu/en/related-content?topic=119' }
    const plan = assessInstitutionalHtmlSource(ec)
    const result = parseInstitutionalHtmlCandidates(plan, '<main><div class="ecl-content-item"><li class="ecl-content-block__primary-meta-item">News article</li><li class="ecl-content-block__primary-meta-item">22 October 2026</li><div class="ecl-content-block__title"><a href="/en/news/europe-ai">European AI</a></div></div></main>')
    expect(result[0]).toMatchObject({ concreteUrl: 'https://digital-strategy.ec.europa.eu/en/news/europe-ai', publishedAt: '2026-10-22T00:00:00.000Z' })
    expect(assessInstitutionalHtmlSource({ ...ec, discoveryUrl: 'https://digital-strategy.ec.europa.eu/en/related-content?topic=other' }).ready).toBe(false)
  })

  it('preserves UNESCO original date, body and list items through the canonical extractor/normalizer', () => {
    const url = 'https://www.unesco.org/en/articles/ai-education'
    const extracted = extractFlashHtmlArticle(source.url, url, article)
    expect(extracted.bodyParagraphs).toEqual(['Original body with important evidence.', 'First pillar.', 'Second pillar.'])
    expect(extracted.bodyText).not.toMatch(/Navigation|Ignore|marketing|outside|Footer/)
    const normalized = normalizeFlashHtmlArticleCandidate({ sourceId: source.id, sourceName: source.nume,
      registeredSourceUrl: source.url, sourceRole: source.sourceRole, editorialTrust: source.editorialTrust,
      citationMode: source.citationMode, allowAutoPublish: false }, extracted)
    expect(normalized).toMatchObject({ sourceAdapter: 'unesco-education', sourcePublicationDate: '2026-10-19', allowAutoPublish: false })
  })

  it.each([
    article.replace('lang="en"', 'lang="fr"'), article.replace('created-time', 'modified-time'),
    article.replace('19 October 2026', '31 February 2026'), article.replace('field--name-field-paragraphs', 'changed-layout'),
    article.replace('</main>', '<h1>Second title</h1></main>'),
  ])('fails closed on language, dates, changed layouts and ambiguous titles', html => {
    expect(() => extractFlashHtmlArticle(source.url, 'https://www.unesco.org/en/articles/ai-education', html)).toThrow()
  })

  it.each([
    [article.replace('lang="en"', 'lang="fr"'), 'document'],
    [article.replace('<main>', '<section>').replace('</main>', '</section>'), 'main container'],
    [article.replace('</main>', '<h1>Ambiguous headline</h1></main>'), 'headline'],
    [article.replace('created-time', 'modified-time'), 'original publication date'],
    [article.replace('field--name-field-description', 'event-description'), 'description'],
    [article.replace('field--name-field-paragraphs', 'changed-layout'), 'article body'],
    [article.replace('<p>Original body with <strong>important evidence</strong>.</p><ul><li>First pillar.</li><li><p>Second pillar.</p></li></ul>', '<div>Body without paragraphs</div>'), 'article body'],
  ])('reports only a bounded layout marker for unsupported UNESCO structure: %s', (html, field) => {
    expect(() => extractFlashHtmlArticle(source.url, 'https://www.unesco.org/en/articles/ai-education', html))
      .toThrow(`FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: ${field}`)
  })

  it('skips an event page without a supported lead before model or persistence work, then processes the next article', async () => {
    const event = article.replace('field--name-field-description', 'event-description')
    const provider = vi.fn()
    const persist = vi.fn()
    const seen: string[] = []
    const result = await runFlashRssStageNextAttempts({
      candidates: [event, article, article], maxAttempts: 3,
      processCandidate: async html => {
        try { extractFlashHtmlArticle(source.url, 'https://www.unesco.org/en/articles/ai-education', html) }
        catch (error) {
          if (!(error instanceof Error) || !isFlashRssArticleUnsupportedLayoutFailure(error.message)) throw error
          seen.push(error.message)
          expect(diagnoseRssHandoffFailure(error.message)).toEqual({ phase: 'article-extraction', reason: 'article_layout_not_supported' })
          return 'skip'
        }
        provider()
        persist()
        return 'complete'
      },
    })
    expect(result).toEqual({ completed: true, attemptedCount: 2 })
    expect(seen).toEqual(['FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: description'])
    expect(provider).toHaveBeenCalledOnce()
    expect(persist).toHaveBeenCalledOnce()
  })

  it('consumes at most three attempts for unsupported UNESCO candidates without calling the provider', async () => {
    const provider = vi.fn()
    const result = await runFlashRssStageNextAttempts({
      candidates: Array(5).fill(article.replace('field--name-field-description', 'event-description')),
      maxAttempts: 3,
      processCandidate: async html => {
        try { extractFlashHtmlArticle(source.url, 'https://www.unesco.org/en/articles/ai-education', html) }
        catch (error) {
          if (error instanceof Error && isFlashRssArticleUnsupportedLayoutFailure(error.message)) return 'skip'
          throw error
        }
        provider()
        return 'complete'
      },
    })
    expect(result).toEqual({ completed: false, attemptedCount: 3 })
    expect(provider).not.toHaveBeenCalled()
  })

  it('does not turn invalid URLs, invalid calendar dates or unknown errors into layout skips', async () => {
    const visited = vi.fn(async () => {
      try { extractFlashHtmlArticle(source.url, 'https://www.unesco.org/en/articles/ai-education', article.replace('19 October 2026', '31 February 2026')) }
      catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(isFlashRssArticleUnsupportedLayoutFailure((error as Error).message)).toBe(false)
        throw error
      }
      return 'complete' as const
    })
    await expect(runFlashRssStageNextAttempts({ candidates: [1, 2], maxAttempts: 3, processCandidate: visited }))
      .rejects.toThrow('Institutional publication date is invalid or missing.')
    expect(visited).toHaveBeenCalledOnce()
    expect(isFlashRssArticleUnsupportedLayoutFailure('Unsupported UNESCO article URL.')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('Unexpected database failure')).toBe(false)
  })

  it('does not accept non-article or cross-host URLs', () => {
    for (const url of ['https://www.unesco.org/en/articles/', 'https://www.unesco.org/fr/articles/ai', 'https://bad.example/en/articles/ai']) {
      expect(() => extractFlashHtmlArticle(source.url, url, article)).toThrow()
    }
  })

  it('records partial discovery failures but can distinguish a total source outage', async () => {
    const lines: string[] = []
    const update = vi.fn()
    const diagnostics = new FlashRssRunDiagnostics(l => lines.push(l))
    await diagnostics.start({ create: vi.fn().mockResolvedValue({ id: 1 }), update } as never, 'test', 'sha')
    diagnostics.sourceDiscoveryFailed(8)
    expect(diagnostics.allSourcesFailed(2)).toBe(false)
    expect(diagnostics.allSourcesFailed(1)).toBe(true)
    diagnostics.result('empty')
    await diagnostics.finish()
    expect(update.mock.lastCall?.[0].data.evidenceSummary).toMatchObject({ sourceDiscoveryFailureCount: 1, lastFailedSourceId: 8 })
    expect(lines.join('')).toContain('RSS_SOURCE_DISCOVERY_FAILED')
  })

  it('uses the existing bounded retriever for HTML and respects refusals', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('refused', { status: 403 }))
    await expect(fetchFlashRssFeedXml({ feedUrl: source.discoveryUrl!, registeredSourceUrl: source.url,
      documentType: 'html', fetchImpl })).rejects.toThrow('403')
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl.mock.calls[0][1].headers.accept).toBe('text/html')
  })
})
