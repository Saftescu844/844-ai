import { retrieveFlashSource } from '../runtimeEvidence/sourceRetriever'
import { extractFlashHtmlArticle } from './htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from './articleCandidateNormalization'
import { assessFlashPublicationFreshness } from './flashPublicationFreshness'
import { evaluateExplicitGroundedEventIdentity } from './explicitGroundedEventIdentity'
import { PRODUCTION_RSS_SOURCE_IDS } from './flashProductionSchedulePolicy'
import type { FlashRssCandidate, FlashRssIngestionSourcePlan } from './rssCandidateIngestion'

export const PRODUCTION_PREFLIGHT_MAX_ARTICLES = 20
export const PRODUCTION_PREFLIGHT_CONCURRENCY = 2
export const PRODUCTION_PREFLIGHT_TIMEOUT_MS = 90_000
export type ProductionPrequalifiedCandidate = FlashRssCandidate & { prequalifiedPublicationDate: string }
type Rejection = 'source_unavailable' | 'retrieval_failed' | 'extraction_failed' | 'article_not_current' | 'identity_pending' | 'identity_ambiguous'
export class ProductionPreflightError extends Error {
  constructor(readonly reason: 'article_limit_exceeded' | 'deadline_exceeded') {
    super(`Production preflight ${reason}.`)
    this.name = 'ProductionPreflightError'
  }
}

/** Read-only and provider-free. Run outside the reservation transaction. */
export async function prequalifyProductionScheduleCandidates({ candidates, plans, now, retrieve = retrieveFlashSource }: {
  candidates: FlashRssCandidate[]
  plans: FlashRssIngestionSourcePlan[]
  now: number
  retrieve?: typeof retrieveFlashSource
}): Promise<{ candidates: ProductionPrequalifiedCandidate[]; checked: number; rejected: Record<Rejection, number> }> {
  assessFlashPublicationFreshness(null, { now, maxAgeDays: 30 })
  if (candidates.length > PRODUCTION_PREFLIGHT_MAX_ARTICLES) throw new ProductionPreflightError('article_limit_exceeded')
  const rejected: Record<Rejection, number> = { source_unavailable: 0, retrieval_failed: 0, extraction_failed: 0, article_not_current: 0, identity_pending: 0, identity_ambiguous: 0 }
  const accepted: Array<ProductionPrequalifiedCandidate | undefined> = new Array(candidates.length)
  let cursor = 0
  let expired = false
  async function worker(): Promise<void> {
    while (!expired && cursor < candidates.length) {
      const index = cursor++
      const candidate = candidates[index]
      const plan = plans.find(source => source.sourceId === candidate.sourceId)
      if (!plan?.ready || plan.allowAutoPublish !== false || !PRODUCTION_RSS_SOURCE_IDS.some(id => id === candidate.sourceId)) {
        rejected.source_unavailable += 1
        continue
      }
      let retrieval: Awaited<ReturnType<typeof retrieveFlashSource>>
      try {
        retrieval = await retrieve({ id: `production-rss-preflight:${candidate.sourceId}`, registeredSourceUrl: plan.registeredSourceUrl, concreteUrl: candidate.concreteUrl })
      } catch { rejected.retrieval_failed += 1; continue }
      if (expired) return
      if (!retrieval.candidate.retrieved || !retrieval.candidate.contentAvailable || !retrieval.textContent) {
        rejected.retrieval_failed += 1
        continue
      }
      try {
        const article = extractFlashHtmlArticle(plan.registeredSourceUrl, retrieval.candidate.finalUrl ?? candidate.concreteUrl, retrieval.textContent)
        const normalized = normalizeFlashHtmlArticleCandidate({ sourceId: plan.sourceId, sourceName: plan.sourceName, registeredSourceUrl: plan.registeredSourceUrl, sourceRole: plan.sourceRole, editorialTrust: plan.editorialTrust, citationMode: plan.citationMode, allowAutoPublish: false }, article)
        if (!assessFlashPublicationFreshness(normalized.sourcePublicationDate, { now, maxAgeDays: 30 }).eligible) {
          rejected.article_not_current += 1
          continue
        }
        const identity = evaluateExplicitGroundedEventIdentity(normalized)
        if (identity.status !== 'grounded' || !identity.identity) {
          rejected[identity.status === 'ambiguous' ? 'identity_ambiguous' : 'identity_pending'] += 1
          continue
        }
        accepted[index] = { ...candidate, prequalifiedPublicationDate: normalized.sourcePublicationDate }
      } catch { rejected.extraction_failed += 1 }
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      Promise.all(Array.from({ length: Math.min(PRODUCTION_PREFLIGHT_CONCURRENCY, candidates.length) }, () => worker())),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { expired = true; reject(new ProductionPreflightError('deadline_exceeded')) }, PRODUCTION_PREFLIGHT_TIMEOUT_MS)
      }),
    ])
  } finally { clearTimeout(timer) }
  return { candidates: accepted.filter((item): item is ProductionPrequalifiedCandidate => Boolean(item)), checked: candidates.length, rejected }
}
