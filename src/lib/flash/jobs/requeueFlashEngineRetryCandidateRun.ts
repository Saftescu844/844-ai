import type {
  Payload,
} from 'payload'

import {
  assertFlashEngineStagingRailwayTarget,
  queueFlashEngineEvaluationJob,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

type FlashEngineAuditRerunPayload =
  Pick<
    Payload,
    | 'findByID'
    | 'find'
    | 'jobs'
  >

export interface RequeueFlashEngineRetryCandidateRunOptions {
  payloadFactory:
    () => Promise<FlashEngineAuditRerunPayload>

  runRecordId:
    number

  allowJobWrite:
    boolean

  allowProviderRequests:
    boolean

  environment?:
    NodeJS.ProcessEnv
}

const RETRY_DISPOSITION_FIELDS = [
  'claimExtractionRecoveryDisposition',
  'verificationRecoveryDisposition',
  'contradictionsRecoveryDisposition',
  'safetyRecoveryDisposition',
  'medicalInterpretationRecoveryDisposition',
  'extraordinaryClaimRecoveryDisposition',
  'regulatoryStatusRecoveryDisposition',
] as const

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      'object' &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  )
}

function positiveInteger(
  value:
    unknown,
): number | null {
  const numeric =
    Number(
      value,
    )

  return (
    Number.isInteger(
      numeric,
    ) &&
    numeric >
      0
  )
    ? numeric
    : null
}

function sectionHasRetryCandidate(
  section:
    unknown,
): boolean {
  if (
    !isRecord(
      section,
    )
  ) {
    return false
  }

  return RETRY_DISPOSITION_FIELDS.some(
    field =>
      section[field] ===
      'retryCandidate',
  )
}

export function flashEngineAuditHasRetryCandidate(
  evidenceSummary:
    unknown,
): boolean {
  if (
    !isRecord(
      evidenceSummary,
    )
  ) {
    return false
  }

  return (
    sectionHasRetryCandidate(
      evidenceSummary.factual,
    ) ||
    sectionHasRetryCandidate(
      evidenceSummary.semantic,
    )
  )
}

/**
 * Creează controlat un job nou dintr-un audit Flash Engine COMPLETAT
 * care conține cel puțin un recoveryDisposition=retryCandidate.
 *
 * Nu reutilizează run-ul sursă și nu execută jobul nou.
 */
export async function requeueFlashEngineRetryCandidateRun({
  payloadFactory,
  runRecordId,
  allowJobWrite,
  allowProviderRequests,
  environment =
    process.env,
}: RequeueFlashEngineRetryCandidateRunOptions) {
  if (
    !Number.isInteger(
      runRecordId,
    ) ||
    runRecordId <=
      0
  ) {
    throw new Error(
      'Invalid Flash Engine audit run record ID: ' +
        String(
          runRecordId,
        ),
    )
  }

  if (
    allowJobWrite !==
    true
  ) {
    throw new Error(
      'Flash Engine retry-candidate job writes are blocked.',
    )
  }

  if (
    allowProviderRequests !==
    true
  ) {
    throw new Error(
      'Provider requests are not authorized for this retry-candidate job.',
    )
  }

  assertFlashEngineStagingRailwayTarget(
    environment,
  )

  const payload =
    await payloadFactory()

  const sourceRun =
    await payload.findByID({
      collection:
        'flash-engine-runs',

      id:
        runRecordId,

      depth:
        0,

      overrideAccess:
        true,
    })

  if (
    sourceRun.status !==
    'completed'
  ) {
    throw new Error(
      'Flash Engine audit run ' +
        String(
          runRecordId,
        ) +
        ' is not completed.',
    )
  }

  if (
    sourceRun.provider !==
    'anthropic'
  ) {
    throw new Error(
      'Flash Engine audit run ' +
        String(
          runRecordId,
        ) +
        ' is not an Anthropic run supported by the current queue task.',
    )
  }

  const flashId =
    positiveInteger(
      sourceRun
        .flashIdSnapshot,
    )

  if (
    flashId ===
    null
  ) {
    throw new Error(
      'Flash Engine audit run ' +
        String(
          runRecordId,
        ) +
        ' has an invalid Flash ID snapshot.',
    )
  }

  const model =
    typeof sourceRun.model ===
      'string'
      ? sourceRun.model.trim()
      : ''

  if (!model) {
    throw new Error(
      'Flash Engine audit run ' +
        String(
          runRecordId,
        ) +
        ' has an invalid model.',
    )
  }

  if (
    !flashEngineAuditHasRetryCandidate(
      sourceRun.evidenceSummary,
    )
  ) {
    throw new Error(
      'Flash Engine audit run ' +
        String(
          runRecordId,
        ) +
        ' has no retryCandidate recovery disposition.',
    )
  }

  const queued =
    await queueFlashEngineEvaluationJob({
      payloadFactory:
        async () =>
          payload,

      flashId,

      model,

      allowJobWrite:
        true,

      allowProviderRequests:
        true,

      environment,
    })

  return {
    sourceRunRecordId:
      runRecordId,

    sourceRunId:
      sourceRun.runId,

    sourceDecision:
      sourceRun.decision ?? null,

    retryJobId:
      queued.job.id,

    flashId,

    provider:
      sourceRun.provider,

    model,

    task:
      queued.task,

    queue:
      queued.queue,

    reusedExisting:
      queued.reusedExisting,
  }
}
