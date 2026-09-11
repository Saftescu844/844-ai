import {
  FLASH_ENGINE_MANUAL_QUEUE,
  FLASH_ENGINE_TASK_SLUG,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  runFlashEngineManualQueueOnce,
} from '@/lib/flash/jobs/runFlashEngineManualQueueOnce'

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function printHelp(): void {
  console.log(`
Flash Engine controlled run-next

Usage:
  pnpm exec tsx scripts/flash-engine-run-next.ts \\
    --allow-job-run \\
    --allow-provider-requests

Behavior:
  - considers only queue: ${FLASH_ENGINE_MANUAL_QUEUE}
  - considers only task: ${FLASH_ENGINE_TASK_SLUG}
  - considers only jobs with totalTried=0
  - considers only jobs whose stored input authorizes provider requests
  - claims and runs at most one eligible job
  - an empty eligible queue is a successful no-op
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
  - there is no scheduler or cron in this CLI

IMPORTANT:
  --allow-provider-requests authorizes real provider calls.
  Do not use this CLI without an explicit execution approval.
`)
}

async function createPayload() {
  /*
   * Payload și configurația sunt importate numai după
   * toate guard-urile care preced inițializarea Payload.
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

  const allowJobRun =
    hasFlag(
      '--allow-job-run',
    )

  const allowProviderRequests =
    hasFlag(
      '--allow-provider-requests',
    )

  const result =
    await runFlashEngineManualQueueOnce({
      payloadFactory:
        createPayload,

      allowJobRun,

      allowProviderRequests,
    })

  if (
    !result.executed
  ) {
    console.log(
      'FLASH_ENGINE_RUN_NEXT_EMPTY',
    )

    console.log({
      task:
        result.task,

      queue:
        result.queue,

      executed:
        false,
    })

    return
  }

  console.log(
    'FLASH_ENGINE_RUN_NEXT_OK',
  )

  console.log({
    jobId:
      result.jobId,

    task:
      result.task,

    queue:
      result.queue,

    executionStatus:
      result.executionStatus,
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
        'FLASH_ENGINE_RUN_NEXT_FAILED',
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
