import type {
  Payload,
} from 'payload'

export const FLASH_ENGINE_MANUAL_QUEUE =
  'flash-engine-manual'

export const FLASH_ENGINE_TASK_SLUG =
  'evaluateFlashEngine'

export const FLASH_ENGINE_STAGING_RAILWAY_TARGET = {
  projectId:
    '44c37d0f-b300-4462-b001-31259ddae5dd',

  environmentId:
    'a589dc28-1c59-468c-9eb4-351fce8fa17b',

  serviceId:
    'e113e429-e2a9-4271-b0a4-6554233037ee',
} as const

type FlashEngineQueuePayload =
  Pick<
    Payload,
    'jobs'
  >

export interface QueueFlashEngineEvaluationJobOptions {
  payloadFactory:
    () => Promise<FlashEngineQueuePayload>

  flashId:
    number

  model:
    string

  allowJobWrite:
    boolean

  allowProviderRequests:
    boolean

  environment?:
    NodeJS.ProcessEnv
}

export function assertFlashEngineStagingRailwayTarget(
  environment:
    NodeJS.ProcessEnv =
      process.env,
): void {
  const mismatches:
    string[] = []

  if (
    environment
      .RAILWAY_PROJECT_ID !==
    FLASH_ENGINE_STAGING_RAILWAY_TARGET
      .projectId
  ) {
    mismatches.push(
      'RAILWAY_PROJECT_ID',
    )
  }

  if (
    environment
      .RAILWAY_ENVIRONMENT_ID !==
    FLASH_ENGINE_STAGING_RAILWAY_TARGET
      .environmentId
  ) {
    mismatches.push(
      'RAILWAY_ENVIRONMENT_ID',
    )
  }

  if (
    environment
      .RAILWAY_SERVICE_ID !==
    FLASH_ENGINE_STAGING_RAILWAY_TARGET
      .serviceId
  ) {
    mismatches.push(
      'RAILWAY_SERVICE_ID',
    )
  }

  if (
    mismatches.length >
    0
  ) {
    throw new Error(
      [
        'Flash Engine enqueue is restricted to the configured STAGING Railway target.',
        `Target mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }
}

export async function queueFlashEngineEvaluationJob({
  payloadFactory,
  flashId,
  model: rawModel,
  allowJobWrite,
  allowProviderRequests,
  environment =
    process.env,
}: QueueFlashEngineEvaluationJobOptions) {
  if (
    !Number.isInteger(
      flashId,
    ) ||
    flashId <= 0
  ) {
    throw new Error(
      `Invalid Flash ID: ${String(flashId)}`,
    )
  }

  const model =
    rawModel.trim()

  if (!model) {
    throw new Error(
      'Anthropic model is required.',
    )
  }

  /**
   * Guard 1:
   * Nicio inițializare Payload și nicio scriere în DB
   * înainte de aprobarea explicită a enqueue-ului.
   */
  if (
    allowJobWrite !==
    true
  ) {
    throw new Error(
      'Flash Engine job writes are blocked.',
    )
  }

  /**
   * Guard 2:
   * Nu introducem în coadă un job capabil să execute
   * request-uri către provider fără autorizare explicită.
   *
   * Enqueue-ul în sine NU execută request-ul Anthropic.
   */
  if (
    allowProviderRequests !==
    true
  ) {
    throw new Error(
      'Provider requests are not authorized for this Flash Engine job.',
    )
  }

  /**
   * Guard 3:
   * Helper-ul poate scrie numai în STAGING-ul Railway
   * identificat prin ID-uri stabile.
   */
  assertFlashEngineStagingRailwayTarget(
    environment,
  )

  /**
   * Payload este inițializat numai după toate guard-urile.
   */
  const payload =
    await payloadFactory()

  const job =
    await payload.jobs.queue({
      task:
        FLASH_ENGINE_TASK_SLUG,

      queue:
        FLASH_ENGINE_MANUAL_QUEUE,

      overrideAccess:
        true,

      input: {
        flashId,

        model,

        allowProviderRequests:
          true,
      },
    })

  return {
    job,

    queue:
      FLASH_ENGINE_MANUAL_QUEUE,

    task:
      FLASH_ENGINE_TASK_SLUG,
  }
}
