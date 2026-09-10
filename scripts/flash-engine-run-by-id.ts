import {
  FLASH_ENGINE_MANUAL_QUEUE,
  FLASH_ENGINE_TASK_SLUG,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  runFlashEngineEvaluationJobByID,
} from '@/lib/flash/jobs/runFlashEngineEvaluationJobByID'

function argument(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index === -1 ||
    index + 1 >=
      process.argv.length
  ) {
    return null
  }

  const value =
    process.argv[
      index + 1
    ]?.trim()

  if (
    !value ||
    value.startsWith(
      '--',
    )
  ) {
    return null
  }

  return value
}

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function positiveIntegerArgument(
  name: string,
): number {
  const raw =
    argument(
      name,
    )

  if (
    !raw
  ) {
    throw new Error(
      `Missing required ${name}`,
    )
  }

  const value =
    Number(
      raw,
    )

  if (
    !Number.isInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `Invalid ${name}: ${raw}`,
    )
  }

  return value
}

function printHelp(): void {
  console.log(`
Flash Engine controlled run-by-ID

Usage:
  pnpm exec tsx scripts/flash-engine-run-by-id.ts \\
    --job-id <job-id> \\
    --flash-id <expected-flash-id> \\
    --model <anthropic-model> \\
    --allow-job-run \\
    --allow-provider-requests

Behavior:
  - verifies exactly one existing Payload job by ID
  - requires task: ${FLASH_ENGINE_TASK_SLUG}
  - requires queue: ${FLASH_ENGINE_MANUAL_QUEUE}
  - verifies Flash ID and model against the stored job input
  - rejects completed, failed, processing, or previously attempted jobs
  - runs only the verified job ID
  - may perform real Anthropic requests
  - does NOT publish or unpublish FlashAI
  - does NOT change editorial state directly

Safety:
  - execution requires --allow-job-run
  - provider access requires --allow-provider-requests
  - execution is restricted to the configured Railway STAGING target
  - PAYLOAD_DB_PUSH must be false
  - ANTHROPIC_API_KEY must be present
  - there is no automatic retry in this CLI

IMPORTANT:
  --allow-provider-requests authorizes real provider calls.
  Do not use this CLI without an explicit execution approval.
`)
}

async function createPayload() {
  /*
   * Payload și configurația sunt importate numai
   * dacă helper-ul a trecut toate guard-urile
   * care preced inițializarea Payload.
   */
  const [
    payloadModule,
    configModule,
  ] =
    await Promise.all([
      import(
        'payload'
      ),

      import(
        '@payload-config'
      ),
    ])

  return payloadModule
    .getPayload({
      config:
        configModule
          .default,
    })
}

async function main() {
  if (
    hasFlag(
      '--help',
    ) ||
    hasFlag(
      '-h',
    )
  ) {
    printHelp()
    return
  }

  const jobId =
    positiveIntegerArgument(
      '--job-id',
    )

  const flashId =
    positiveIntegerArgument(
      '--flash-id',
    )

  const model =
    argument(
      '--model',
    )

  if (
    !model
  ) {
    throw new Error(
      'Missing required --model',
    )
  }

  const allowJobRun =
    hasFlag(
      '--allow-job-run',
    )

  const allowProviderRequests =
    hasFlag(
      '--allow-provider-requests',
    )

  const result =
    await runFlashEngineEvaluationJobByID({
      payloadFactory:
        createPayload,

      jobId,

      expectedFlashId:
        flashId,

      expectedModel:
        model,

      allowJobRun,

      allowProviderRequests,
    })

  console.log(
    'FLASH_ENGINE_RUN_BY_ID_OK',
  )

  console.log({
    jobId:
      result.jobId,

    flashId:
      result.flashId,

    task:
      result.task,

    queue:
      result.queue,

    model:
      result.model,

    executionStatus:
      result.result
        .jobStatus?.[
          String(
            result.jobId,
          )
        ]?.status,
  })
}

main()
  .then(
    () => {
      process.exit(
        0,
      )
    },
  )
  .catch(
    error => {
      console.error(
        'FLASH_ENGINE_RUN_BY_ID_FAILED',
      )

      console.error(
        error instanceof Error
          ? error.message
          : error,
      )

      process.exit(
        1,
      )
    },
  )
