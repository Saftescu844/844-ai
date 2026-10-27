import { extractFlashHtmlArticle } from '../src/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '../src/lib/flash/ingestion/articleCandidateNormalization'
import { resolveMicrosoftResearchPaperEvidence } from '../src/lib/flash/ingestion/microsoftResearchPaperEvidence'
import { evaluateExplicitGroundedEventIdentity } from '../src/lib/flash/ingestion/explicitGroundedEventIdentity'
import { retrieveFlashSource } from '../src/lib/flash/runtimeEvidence/sourceRetriever'
import { FLASH_ENGINE_STAGING_RAILWAY_TARGET } from '../src/lib/flash/jobs/queueFlashEngineEvaluationJob'

const sourceUrl = 'https://www.microsoft.com/en-us/research/'
const samples = [
  { slug: 'simulating-student-learning-for-better-ai-tutoring', blogDate: '2026-10-12', paperId: '2609.01591', paperDate: '2026-09-01' },
  { slug: 'agent-lightning-v1-0-a-3500-line-lightweight-agentic-rl-framework-for-training-agents-with-real-harnesses',
    blogDate: '2026-10-07', paperId: '2608.17528', paperDate: '2026-08-18' },
] as const

// Read-only fixed-sample acceptance probe. At most four requests, all to Microsoft; no Payload or model client.
async function main() {
  const args = process.argv.slice(2)
  if (args.length > 1 || args.length === 1 && !['--probe', '--help'].includes(args[0]!)) throw new Error('Unknown option.')
  if (args[0] === '--help') { console.log('Usage: node --import tsx scripts/flash-microsoft-paper-evidence-preview.ts [--probe]'); return }
  if (args[0] !== '--probe') {
    console.log(JSON.stringify({ samples: samples.map(s => ({ articleUrl: `${sourceUrl}blog/${s.slug}/`, blogDate: s.blogDate,
      paperId: s.paperId, paperDate: s.paperDate })), maximumRequests: 4, providerCalled: false, activated: false }))
    return
  }
  if (process.env.RAILWAY_PROJECT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.projectId ||
      process.env.RAILWAY_ENVIRONMENT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.environmentId ||
      process.env.RAILWAY_SERVICE_ID !== '7be51b73-dc87-4a53-9ad4-879c00aecad6') {
    throw new Error('Paper evidence probes require the known staging one-off service.')
  }
  for (const sample of samples) {
    const articleUrl = `${sourceUrl}blog/${sample.slug}/`
    const result = await retrieveFlashSource({ id: 'microsoft-research-blog-probe', registeredSourceUrl: sourceUrl,
      concreteUrl: articleUrl }, { timeoutMs: 15_000, maxBytes: 2_000_000, maxRedirects: 0 })
    if (result.failureReason || !result.textContent || result.bytesRead >= 2_000_000 || result.candidate.finalUrl !== articleUrl) {
      throw new Error('Blog sample could not be retrieved.')
    }
    const article = extractFlashHtmlArticle(sourceUrl, articleUrl, result.textContent)
    const paper = await resolveMicrosoftResearchPaperEvidence({ sourceUrl, articleUrl, html: result.textContent })
    const candidate = normalizeFlashHtmlArticleCandidate({ sourceId: 0, sourceName: 'Microsoft Research',
      registeredSourceUrl: sourceUrl, sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase',
      allowAutoPublish: false }, { ...article, primaryEvidenceUrls: paper.primaryEvidenceUrls })
    const identity = evaluateExplicitGroundedEventIdentity(candidate)
    if (paper.status !== 'resolved_arxiv' || identity.status !== 'grounded' ||
        identity.identity?.authority !== 'arxiv' || identity.identity.stableId !== sample.paperId ||
        candidate.sourcePublicationDate !== sample.blogDate || paper.publicationDate !== sample.paperDate) {
      throw new Error('Paper evidence sample no longer matches the reviewed chain.')
    }
    console.log(JSON.stringify({ status: 'paper_identity_verified', articleUrl, publicationUrl: paper.publicationUrl,
      blogDate: candidate.sourcePublicationDate, paperDate: paper.publicationDate, identity: identity.identity,
      providerCalled: false, persisted: false, activated: false }))
  }
}
main().catch(() => { console.error('FLASH_MICROSOFT_PAPER_EVIDENCE_PREVIEW_FAILED'); process.exitCode = 1 })
