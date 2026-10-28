import type { Payload } from 'payload'
import type { Surse } from '@/payload-types'
import type { FlashAiStagingWriteInput } from './flashAiStagingWriteInput'
import { buildFlashGroundedEventFingerprint } from './groundedEventFingerprint'
import { assessFlashRssIngestionSource } from './rssCandidateIngestion'
import { FLASH_ENGINE_STAGING_RAILWAY_TARGET } from '../jobs/queueFlashEngineEvaluationJob'

export const STUDENT_SIM_PILOT_FLAG = '--allow-staging-studentsim-pilot'
export const STUDENT_SIM_PILOT = {
  serviceId: '7be51b73-dc87-4a53-9ad4-879c00aecad6',
  sourceId: 10,
  sourceUrl: 'https://www.microsoft.com/en-us/research/',
  feedUrl: 'https://www.microsoft.com/en-us/research/feed/',
  articleUrl: 'https://www.microsoft.com/en-us/research/blog/simulating-student-learning-for-better-ai-tutoring/',
  primaryEvidenceUrl: 'https://arxiv.org/abs/2609.01591',
  eventFingerprint: buildFlashGroundedEventFingerprint({ authority: 'arxiv', stableId: '2609.01591' }).eventFingerprint,
} as const

/** Exact one-off opt-in. Never grants the hourly worker or production a disabled-source override. */
export function assertStudentSimPilotTarget({ environment, sourceId, articleUrl, allowProduction = false, readOnlyPilot = false }: {
  environment: NodeJS.ProcessEnv; sourceId: number | null; articleUrl: string | null
  allowProduction?: boolean; readOnlyPilot?: boolean
}): void {
  if (allowProduction || readOnlyPilot ||
      environment.RAILWAY_PROJECT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.projectId ||
      environment.RAILWAY_ENVIRONMENT_ID !== FLASH_ENGINE_STAGING_RAILWAY_TARGET.environmentId ||
      environment.RAILWAY_SERVICE_ID !== STUDENT_SIM_PILOT.serviceId || environment.PAYLOAD_DB_PUSH !== 'false' ||
      sourceId !== STUDENT_SIM_PILOT.sourceId || articleUrl !== STUDENT_SIM_PILOT.articleUrl) {
    throw new Error('StudentSim pilot requires the exact staging one-off target, source #10 and reviewed article URL.')
  }
}

export function studentSimPilotChildOptions(enabled: boolean): string[] {
  return enabled ? [STUDENT_SIM_PILOT_FLAG, '--require-grounded-event-identity'] : []
}

export function assertStudentSimPilotBounds(maxItems: number | null, maxAttempts: number | null, maxAgeDays: number): void {
  if (maxItems !== 1 || maxAttempts !== 1 || maxAgeDays !== 30) {
    throw new Error('StudentSim pilot requires explicit --max-items 1, --max-attempts 1 and the unchanged 30-day freshness policy.')
  }
}

/** The source stays active in the registry and excluded from scheduled ingestion. No updates are performed. */
export function assertStudentSimPilotSource(source: Surse | null | undefined): asserts source is Surse {
  const pillars = source?.pilon?.map(p => typeof p === 'number' ? p : p.id).sort((a, b) => a - b)
  if (!source || source.id !== STUDENT_SIM_PILOT.sourceId || source.activa !== true ||
      source.url !== STUDENT_SIM_PILOT.sourceUrl || source.feedRSS !== STUDENT_SIM_PILOT.feedUrl ||
      source.discoveryMethod !== 'rss' || source.discoveryUrl || source.sourceRole !== 'primary' ||
      source.editorialTrust !== 'standard' || source.citationMode !== 'paraphrase' ||
      source.allowIngestion !== false || source.allowAutoPublish !== false ||
      JSON.stringify(pillars) !== JSON.stringify([1, 3, 4, 5])) {
    throw new Error('StudentSim pilot source policy no longer matches the reviewed ingestion-disabled configuration.')
  }
}

export async function readStudentSimPilotSource(payload: Pick<Payload, 'find'>): Promise<Surse> {
  const result = await payload.find({ collection: 'surse', depth: 0, overrideAccess: true, limit: 1,
    where: { id: { equals: STUDENT_SIM_PILOT.sourceId } } })
  const source = result.docs[0]
  assertStudentSimPilotSource(source)
  return source
}

/** Reuses the ordinary RSS assessment; this helper never changes the global source planner. */
export async function planStudentSimPilotSource(payload: Pick<Payload, 'find'>) {
  const source = await readStudentSimPilotSource(payload)
  const plan = assessFlashRssIngestionSource(source)
  if (!plan.ready) throw new Error('StudentSim pilot source is not RSS-ready.')
  return [plan]
}

/** Compare observed evidence to the reviewed identifier; never inject the identifier into a candidate. */
export function assertStudentSimPilotEvidence(primaryEvidenceUrls: readonly string[]): void {
  if (primaryEvidenceUrls.length !== 1 || primaryEvidenceUrls[0] !== STUDENT_SIM_PILOT.primaryEvidenceUrl) {
    throw new Error('StudentSim pilot did not observe its reviewed primary research identifier.')
  }
}

export function assertStudentSimPilotHandoffs(ro: FlashAiStagingWriteInput, en: FlashAiStagingWriteInput): void {
  for (const input of [ro, en]) {
    const c = input.candidate
    if (c.sourceId !== STUDENT_SIM_PILOT.sourceId || c.canonicalUrl !== STUDENT_SIM_PILOT.articleUrl ||
        c.sourceRole !== 'primary' || c.editorialTrust !== 'standard' || c.allowAutoPublish !== false ||
        input.projection.eventFingerprint !== STUDENT_SIM_PILOT.eventFingerprint) {
      throw new Error('StudentSim pilot handoff does not match its reviewed source, article and grounded event.')
    }
    assertStudentSimPilotEvidence(c.primaryEvidenceUrls ?? [])
  }
}
