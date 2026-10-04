import { createHash } from 'node:crypto'
import { extractFlashHtmlArticle } from '../src/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '../src/lib/flash/ingestion/articleCandidateNormalization'
import { retrieveFlashSource } from '../src/lib/flash/runtimeEvidence/sourceRetriever'

// Fixed public samples, not a registry ingestion job. No Payload, models, or persistence.
const samples = [
  { sourceId: 5, sourceName: 'Google Research', registeredSourceUrl: 'https://research.google/',
    url: 'https://research.google/blog/the-future-of-practice-enabling-teachers-to-create-learning-interactives-with-generative-ui/',
    date: '2026-09-17' },
  { sourceId: 6, sourceName: 'MIT News', registeredSourceUrl: 'https://news.mit.edu/',
    url: 'https://news.mit.edu/2026/instructmesh-tool-lets-users-repair-ai-3d-models-then-fabricate-them-1001',
    date: '2026-10-01' },
] as const

async function main(): Promise<void> {
  if (process.env.RAILWAY_PROJECT_ID !== '44c37d0f-b300-4462-b001-31259ddae5dd'
    || process.env.RAILWAY_ENVIRONMENT_ID !== 'a589dc28-1c59-468c-9eb4-351fce8fa17b') {
    throw new Error('This public-source preview runs only in the designated staging project/environment.')
  }
  for (const sample of samples) {
    try {
      const result = await retrieveFlashSource({ id: String(sample.sourceId),
        registeredSourceUrl: sample.registeredSourceUrl, concreteUrl: sample.url },
      { timeoutMs: 15000, maxBytes: 2000000 })
      if (result.failureReason || !result.textContent) {
        throw new Error(`Retrieval failed: ${result.failureReason}; HTTP ${result.statusCode}`)
      }
      const article = extractFlashHtmlArticle(sample.registeredSourceUrl,
        result.candidate.finalUrl ?? sample.url, result.textContent)
      const candidate = normalizeFlashHtmlArticleCandidate({ ...sample, sourceRole: 'primary',
        editorialTrust: 'standard', citationMode: 'paraphrase', allowAutoPublish: false }, article)
      if (candidate.sourcePublicationDate !== sample.date) throw new Error('Sample publication date changed.')
      console.log(JSON.stringify({ message: 'FLASH_RESEARCH_ARTICLE_PREVIEW', status: 'pass',
        source: sample.sourceName, adapter: candidate.sourceAdapter, httpStatus: result.statusCode,
        title: candidate.title, canonicalUrl: candidate.canonicalUrl,
        publicationDateRaw: candidate.sourcePublicationDateRaw, publicationDate: candidate.sourcePublicationDate,
        paragraphCount: candidate.bodyParagraphs.length, provenanceParagraphCount: candidate.provenanceParagraphs?.length,
        leadKind: candidate.leadKind, bodyCharacters: candidate.bodyText.length,
        bodySha256: createHash('sha256').update(candidate.bodyText).digest('hex'),
        generated: false, persisted: false, published: false }))
    } catch (error) {
      process.exitCode = 1
      console.error(JSON.stringify({ message: 'FLASH_RESEARCH_ARTICLE_PREVIEW', status: 'fail',
        source: sample.sourceName, reason: error instanceof Error ? error.message : String(error) }))
    }
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
