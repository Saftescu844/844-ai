import {
  FLASH_ENGINE_MANUAL_QUEUE,
  queueFlashEngineEvaluationJob,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

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

function printHelp(): void {
  console.log(`
Flash Engine controlled enqueue

Usage:
  pnpm exec tsx scripts/flash-engine-enqueue.ts \\
    --flash-id <id> \\
    --model <anthropic-model> \\
    --allow-job-write \\
    --allow-provider-requests

Behavior:
  - queues one evaluateFlashEngine task when no equivalent pending job exists
  - reuses an equivalent untouched pending job for the same Flash + model
  - uses queue: ${FLASH_ENGINE_MANUAL_QUEUE}
  - does NOT run the job
  - does NOT call Anthropic during enqueue
  - does NOT modify FlashAI editorial state
  - does NOT publish or unpublish

Safety:
  - job writes require --allow-job-write
  - provider-capable jobs require --allow-provider-requests
  - enqueue is restricted to the configured Railway STAGING target
  - the manual queue is intentionally separate from the default autoRun queue
`)
}

async function createPayload() {
  /**
   * Payload și configurația sunt importate numai după
   * validarea tuturor guard-urilor din helper.
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

  const flashIdRaw =
    argument(
      '--flash-id',
    )

  const model =
    argument(
      '--model',
    )

  const allowJobWrite =
    hasFlag(
      '--allow-job-write',
    )

  const allowProviderRequests =
    hasFlag(
      '--allow-provider-requests',
    )

  if (!flashIdRaw) {
    throw new Error(
      'Missing required --flash-id',
    )
  }

  const flashId =
    Number(
      flashIdRaw,
    )

  if (
    !Number.isInteger(
      flashId,
    ) ||
    flashId <= 0
  ) {
    throw new Error(
      `Invalid --flash-id: ${flashIdRaw}`,
    )
  }

  if (!model) {
    throw new Error(
      'Missing required --model',
    )
  }

  const result =
    await queueFlashEngineEvaluationJob({
      payloadFactory:
        createPayload,

      flashId,

      model,

      allowJobWrite,

      allowProviderRequests,
    })

  console.log(
    'FLASH_ENGINE_ENQUEUE_OK',
  )

  console.log({
    jobId:
      result.job.id,

    flashId,

    task:
      result.task,

    queue:
      result.queue,

    model:
      model.trim(),

    providerAuthorized:
      true,

    automaticallyRun:
      false,

    reusedExisting:
      result.reusedExisting,
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
        'FLASH_ENGINE_ENQUEUE_FAILED',
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
