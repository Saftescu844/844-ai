import type {
  Payload,
} from 'payload'

import {
  FLASH_ENGINE_MANUAL_QUEUE,
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
  FLASH_ENGINE_TASK_SLUG,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

type FlashEngineRunPayload =
  Pick<
    Payload,
    'findByID' | 'jobs'
  >

export interface RunFlashEngineEvaluationJobByIDOptions {
  payloadFactory:
    () => Promise<FlashEngineRunPayload>

  jobId:
    number

  expectedFlashId:
    number

  expectedModel:
    string

  allowJobRun:
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

export function assertFlashEngineRunStagingEnvironment(
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
    environment
      .PAYLOAD_DB_PUSH !==
    'false'
  ) {
    mismatches.push(
      'PAYLOAD_DB_PUSH',
    )
  }

  if (
    !environment
      .ANTHROPIC_API_KEY
  ) {
    mismatches.push(
      'ANTHROPIC_API_KEY',
    )
  }

  if (
    mismatches.length >
    0
  ) {
    throw new Error(
      [
        'Flash Engine execution is restricted to the configured STAGING environment.',
        `Environment mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }
}

export async function runFlashEngineEvaluationJobByID({
  payloadFactory,
  jobId,
  expectedFlashId,
  expectedModel: rawExpectedModel,
  allowJobRun,
  allowProviderRequests,
  environment =
    process.env,
}: RunFlashEngineEvaluationJobByIDOptions) {
  if (
    !Number.isInteger(
      jobId,
    ) ||
    jobId <=
      0
  ) {
    throw new Error(
      `Invalid Flash Engine job ID: ${String(jobId)}`,
    )
  }

  if (
    !Number.isInteger(
      expectedFlashId,
    ) ||
    expectedFlashId <=
      0
  ) {
    throw new Error(
      `Invalid expected Flash ID: ${String(expectedFlashId)}`,
    )
  }

  const expectedModel =
    rawExpectedModel.trim()

  if (
    !expectedModel
  ) {
    throw new Error(
      'Expected Anthropic model is required.',
    )
  }

  /*
   * Guard 1:
   * runByID este interzis fără autorizarea
   * explicită a execuției.
   */
  if (
    allowJobRun !==
    true
  ) {
    throw new Error(
      'Flash Engine job execution is blocked.',
    )
  }

  /*
   * Guard 2:
   * execuția poate ajunge la provider,
   * deci cere autorizare separată.
   */
  if (
    allowProviderRequests !==
    true
  ) {
    throw new Error(
      'Provider requests are not authorized for Flash Engine execution.',
    )
  }

  /*
   * Guard 3:
   * numai STAGING-ul Railway cunoscut,
   * PAYLOAD_DB_PUSH=false și cheie provider prezentă.
   *
   * Nicio inițializare Payload înainte de acest punct.
   */
  assertFlashEngineRunStagingEnvironment(
    environment,
  )

  const payload =
    await payloadFactory()

  /*
   * Guard 4:
   * citim jobul exact înainte de execuție
   * și îl legăm de intenția operatorului.
   */
  const job =
    await payload.findByID({
      collection:
        'payload-jobs',

      id:
        jobId,

      depth:
        0,

      overrideAccess:
        true,
    })

  if (
    job.taskSlug !==
    FLASH_ENGINE_TASK_SLUG
  ) {
    throw new Error(
      `Job ${jobId} is not an ${FLASH_ENGINE_TASK_SLUG} task.`,
    )
  }

  if (
    job.queue !==
    FLASH_ENGINE_MANUAL_QUEUE
  ) {
    throw new Error(
      `Job ${jobId} is not in the ${FLASH_ENGINE_MANUAL_QUEUE} queue.`,
    )
  }

  if (
    job.completedAt
  ) {
    throw new Error(
      `Job ${jobId} is already completed.`,
    )
  }

  if (
    job.hasError ===
    true
  ) {
    throw new Error(
      `Job ${jobId} is already marked as failed.`,
    )
  }

  if (
    job.processing ===
    true
  ) {
    throw new Error(
      `Job ${jobId} is already processing.`,
    )
  }

  if (
    Number(
      job.totalTried ??
        0,
    ) !==
    0
  ) {
    throw new Error(
      `Job ${jobId} has already been attempted.`,
    )
  }

  if (
    !isRecord(
      job.input,
    )
  ) {
    throw new Error(
      `Job ${jobId} has invalid input.`,
    )
  }

  if (
    job.input.flashId !==
    expectedFlashId
  ) {
    throw new Error(
      `Job ${jobId} Flash ID does not match the authorized Flash ID.`,
    )
  }

  if (
    job.input.model !==
    expectedModel
  ) {
    throw new Error(
      `Job ${jobId} model does not match the authorized model.`,
    )
  }

  if (
    job.input
      .allowProviderRequests !==
    true
  ) {
    throw new Error(
      `Job ${jobId} is not provider-authorized.`,
    )
  }

  /*
   * Singurul punct care execută efectiv jobul.
   * Vizăm numai ID-ul verificat.
   */
  const result =
    await payload.jobs.runByID({
      id:
        jobId,

      overrideAccess:
        true,

      silent:
        false,
    })

  /*
   * runByID poate returna un status de eroare
   * fără să arunce neapărat o excepție.
   * Pentru operator, numai success este acceptat.
   */
  const executionStatus =
    result.jobStatus?.[
      String(
        jobId,
      )
    ]

  if (
    !executionStatus
  ) {
    throw new Error(
      `Job ${jobId} did not produce an execution status.`,
    )
  }

  if (
    executionStatus.status !==
    'success'
  ) {
    throw new Error(
      `Job ${jobId} execution failed with status: ${executionStatus.status}.`,
    )
  }

  return {
    result,

    jobId,

    flashId:
      expectedFlashId,

    model:
      expectedModel,

    task:
      FLASH_ENGINE_TASK_SLUG,

    queue:
      FLASH_ENGINE_MANUAL_QUEUE,
  }
}
