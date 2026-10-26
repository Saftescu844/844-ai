import { extractFlashHtmlArticle } from '../src/lib/flash/ingestion/htmlArticleExtraction'
import { assessFlashRssIngestionSource, parseFlashRssCandidates } from '../src/lib/flash/ingestion/rssCandidateIngestion'
import { FLASH_DISCOVERY_CATALOG } from '../src/lib/flash/ingestion/flashDiscoveryCatalog'
import { fetchFlashRssFeedXml } from '../src/lib/flash/ingestion/rssFeedRetriever'
import { assessInstitutionalHtmlSource, parseInstitutionalHtmlCandidates } from '../src/lib/flash/ingestion/institutionalHtmlDiscovery'
import { filterFlashRssFreshCandidates } from '../src/lib/flash/ingestion/flashPublicationFreshness'
import { FLASH_ENGINE_STAGING_RAILWAY_TARGET } from '../src/lib/flash/jobs/queueFlashEngineEvaluationJob'
import type { Surse } from '../src/payload-types'

// Read-only endpoint probe. No Payload instance, model client, CMS writes or registry activation.
async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node --import tsx scripts/flash-first-source-expansion-preview.ts [--probe]')
    console.log('Default: offline plan. --probe: staging-only bounded GET of EC, UNESCO, OpenAI and Anthropic; no AI or CMS writes.')
    return
  }
  if (process.argv.slice(2).some(a => a !== '--probe')) throw new Error('Unknown option.')
  const sources = FLASH_DISCOVERY_CATALOG.filter(s => ['ec-ai', 'unesco-education', 'openai-news', 'anthropic-news'].includes(s.key))
  if (!process.argv.includes('--probe')) {
    console.log(JSON.stringify(sources.map(s => ({ key: s.key, method: s.method, url: s.discoveryUrl,
      articleAdapterAvailable: ['ec-ai', 'unesco-education', 'openai-news'].includes(s.key), activated: false }))))
    return
  }
  if (process.env.RAILWAY_PROJECT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.projectId ||
      process.env.RAILWAY_ENVIRONMENT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.environmentId) {
    throw new Error('Endpoint probes are restricted to the known staging project and environment.')
  }
  let failures = 0
  const now = Date.now()
  for (const source of sources) {
    let document: string
    try {
      document = await fetchFlashRssFeedXml({ feedUrl: source.discoveryUrl, registeredSourceUrl: source.sourceUrl,
        documentType: source.method === 'html' ? 'html' : 'rss' })
    } catch {
      failures += 1
      console.log(JSON.stringify({ key: source.key, status: 'retrieval_failed', providerCalled: false }))
      continue
    }
    if (source.key === 'openai-news') {
      try {
        const plan = assessFlashRssIngestionSource({ id: 7, nume: source.name, url: source.sourceUrl,
          feedRSS: source.discoveryUrl, sourceRole: 'primary', editorialTrust: 'standard',
          citationMode: 'paraphrase', allowAutoPublish: false, rssCandidateSkipMemory: [] })
        const parsed = await parseFlashRssCandidates(plan, document, { maxItems: 50, scanBeforeEligibility: true })
        const fresh = filterFlashRssFreshCandidates(parsed.candidates, { now })
        console.log(JSON.stringify({ key: source.key, status: 'feed_parsed', items: parsed.totalItems,
          freshCandidates: fresh.candidates.length, dateRejections: fresh.rejected, providerCalled: false }))
        const first = fresh.candidates.sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))[0]
        if (first) {
          const articleHtml = await fetchFlashRssFeedXml({ feedUrl: first.concreteUrl,
            registeredSourceUrl: source.sourceUrl, documentType: 'html' })
          const article = extractFlashHtmlArticle(source.sourceUrl, first.concreteUrl, articleHtml)
          console.log(JSON.stringify({ key: source.key, status: 'article_extracted',
            paragraphs: article.bodyParagraphs.length, words: article.bodyText.trim().split(/\s+/).length,
            publicationDate: article.publicationDate, providerCalled: false }))
        }
      } catch { failures += 1; console.log(JSON.stringify({ key: source.key, status: 'parse_failed', providerCalled: false })) }
    } else if (source.key === 'anthropic-news') {
      console.log(JSON.stringify({ key: source.key, status: 'retrieved_article_adapter_pending', providerCalled: false }))
    } else {
      try {
        const plan = assessInstitutionalHtmlSource({ id: 1, nume: source.name, url: source.sourceUrl,
          discoveryMethod: 'html', discoveryUrl: source.discoveryUrl } as Surse)
        const candidates = parseInstitutionalHtmlCandidates(plan, document)
        const fresh = filterFlashRssFreshCandidates(candidates, { now })
        console.log(JSON.stringify({ key: source.key, status: 'listing_parsed', candidates: candidates.length,
          freshCandidates: fresh.candidates.length, dateRejections: fresh.rejected, providerCalled: false }))
        const first = fresh.candidates.sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))[0]
        if (first) {
          const articleHtml = await fetchFlashRssFeedXml({ feedUrl: first.concreteUrl,
            registeredSourceUrl: source.sourceUrl, documentType: 'html' })
          const article = extractFlashHtmlArticle(source.sourceUrl, first.concreteUrl, articleHtml)
          console.log(JSON.stringify({ key: source.key, status: 'article_extracted',
            paragraphs: article.bodyParagraphs.length, words: article.bodyText.trim().split(/\s+/).length,
            publicationDate: article.publicationDate, providerCalled: false }))
        }
      } catch { failures += 1; console.log(JSON.stringify({ key: source.key, status: 'parse_failed', providerCalled: false })) }
    }
  }
  if (failures) process.exitCode = 1
}
main().catch(() => { console.error('FLASH_FIRST_SOURCE_EXPANSION_PREVIEW_FAILED'); process.exitCode = 1 })
