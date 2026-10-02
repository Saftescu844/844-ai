import type {
  Payload,
} from 'payload'

import {
  FLASH_ENGINE_MANUAL_QUEUE,
  FLASH_ENGINE_TASK_SLUG,
  assertFlashEngineStagingRailwayTarget,
  queueFlashEngineEvaluationJob,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

type FlashEngineRetryPayload =
  Pick<
    Payload,
    | 'findByID'
    | 'find'
    | 'jobs'
  >

export interface RequeueFailedFlashEngineEvaluationJobOptions {
  payloadFactory:
    () => Promise<FlashEngineRetryPayload>

  failedJobId:
    number

  allowJobWrite:
    boolean

  allowProviderRequests:
    boolean

  environment?:
    NodeJS.ProcessEnv
}

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

/**
 * Creează controlat un job nou pornind exclusiv de la un job Flash Engine
 * deja eșuat.
 *
 * Design intenționat:
 * - jobul sursă rămâne neschimbat;
 * - nu refolosim același job ID;
 * - nu activăm retry nativ Payload;
 * - noul job primește un ID nou și, implicit, un runId audit nou;
 * - requeue-ul NU execută providerul;
 * - duplicate guard-ul existent poate reutiliza un job pending echivalent.
 */
export async function requeueFailedFlashEngineEvaluationJob({
  payloadFactory,
  failedJobId,
  allowJobWrite,
  allowProviderRequests,
  environment =
    process.env,
}: RequeueFailedFlashEngineEvaluationJobOptions) {
  if (
    !Number.isInteger(
      failedJobId,
    ) ||
    failedJobId <=
      0
  ) {
    throw new Error(
      'Invalid failed Flash Engine job ID: ' +
        String(
          failedJobId,
        ),
    )
  }

  if (
    allowJobWrite !==
    true
  ) {
    throw new Error(
      'Flash Engine retry job writes are blocked.',
    )
  }

  if (
    allowProviderRequests !==
    true
  ) {
    throw new Error(
      'Provider requests are not authorized for this Flash Engine retry job.',
    )
  }

  assertFlashEngineStagingRailwayTarget(
    environment,
  )

  const payload =
    await payloadFactory()

  const sourceJob =
    await payload.findByID({
      collection:
        'payload-jobs',

      id:
        failedJobId,

      depth:
        0,

      overrideAccess:
        true,
    })

  if (
    sourceJob.taskSlug !==
    FLASH_ENGINE_TASK_SLUG
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' is not an ' +
        FLASH_ENGINE_TASK_SLUG +
        ' task.',
    )
  }

  if (
    sourceJob.queue !==
    FLASH_ENGINE_MANUAL_QUEUE
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' is not in the ' +
        FLASH_ENGINE_MANUAL_QUEUE +
        ' queue.',
    )
  }

  if (
    sourceJob.processing ===
    true
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' is still processing.',
    )
  }

  if (
    sourceJob.hasError !==
    true
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' is not marked as failed.',
    )
  }

  if (
    Number(
      sourceJob.totalTried ??
        0,
    ) <
    1
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' has no recorded attempt.',
    )
  }

  if (
    !isRecord(
      sourceJob.input,
    )
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' has invalid input.',
    )
  }

  const flashId =
    positiveInteger(
      sourceJob.input
        .flashId,
    )

  if (
    flashId ===
    null
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' has an invalid Flash ID.',
    )
  }

  const model =
    typeof sourceJob.input
      .model ===
      'string'
      ? sourceJob.input
          .model
          .trim()
      : ''

  if (!model) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' has an invalid model.',
    )
  }

  if (
    sourceJob.input
      .allowProviderRequests !==
    true
  ) {
    throw new Error(
      'Job ' +
        String(
          failedJobId,
        ) +
        ' is not provider-authorized.',
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
    sourceJobId:
      failedJobId,

    retryJobId:
      queued.job.id,

    flashId,

    model,

    task:
      queued.task,

    queue:
      queued.queue,

    reusedExisting:
      queued.reusedExisting,
  }
}
