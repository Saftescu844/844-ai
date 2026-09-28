import {
  requeueFailedFlashEngineEvaluationJob,
} from '@/lib/flash/jobs/requeueFailedFlashEngineEvaluationJob'

import {
  serializeStructuredRuntimeEvent,
} from '@/lib/observability/structuredRuntimeEvent'

function argument(
  name:
    string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index ===
      -1 ||
    index +
      1 >=
      process.argv.length
  ) {
    return null
  }

  const value =
    process.argv[
      index +
        1
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
  name:
    string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function positiveIntegerArgument(
  name:
    string,
): number {
  const raw =
    argument(
      name,
    )

  if (!raw) {
    throw new Error(
      'Missing required ' +
        name,
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
      'Invalid ' +
        name +
        ': ' +
        raw,
    )
  }

  return value
}

function printHelp(): void {
  console.log(
    [
      '',
      'Flash Engine controlled retry enqueue',
      '',
      'Usage:',
      '  pnpm exec tsx scripts/flash-engine-retry-failed.ts \\',
      '    --job-id <failed-job-id> \\',
      '    --allow-job-write \\',
      '    --allow-provider-requests',
      '',
      'Behavior:',
      '  - verifies one existing failed Flash Engine job by ID',
      '  - preserves the failed source job unchanged',
      '  - queues a fresh equivalent job, or reuses an untouched equivalent pending job',
      '  - does NOT run the new job',
      '  - does NOT call Anthropic during requeue',
      '  - does NOT enable Payload automatic retries',
      '  - does NOT publish or change editorial state',
      '',
      'Safety:',
      '  - retry job writes require --allow-job-write',
      '  - provider-capable retry jobs require --allow-provider-requests',
      '  - requeue is restricted to the configured Railway STAGING target',
      '',
    ].join(
      '\n',
    ),
  )
}

async function createPayload() {
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

  const failedJobId =
    positiveIntegerArgument(
      '--job-id',
    )

  const allowJobWrite =
    hasFlag(
      '--allow-job-write',
    )

  const allowProviderRequests =
    hasFlag(
      '--allow-provider-requests',
    )

  const result =
    await requeueFailedFlashEngineEvaluationJob({
      payloadFactory:
        createPayload,

      failedJobId,

      allowJobWrite,

      allowProviderRequests,
    })

  console.log(
    'FLASH_ENGINE_RETRY_ENQUEUE_OK',
  )

  console.log({
    sourceJobId:
      result.sourceJobId,

    retryJobId:
      result.retryJobId,

    flashId:
      result.flashId,

    task:
      result.task,

    queue:
      result.queue,

    reusedExisting:
      result.reusedExisting,
  })

  console.log(
    serializeStructuredRuntimeEvent({
      event:
        'flash.engine.retry-enqueue',

      component:
        'flash-engine-retry-failed-cli',

      status:
        'success',

      correlationId:
        'flash-engine-job:' +
        String(
          result.retryJobId,
        ),

      data: {
        sourceJobId:
          result.sourceJobId,

        retryJobId:
          result.retryJobId,

        flashId:
          result.flashId,

        task:
          result.task,

        queue:
          result.queue,

        reusedExisting:
          result.reusedExisting,
      },
    }),
  )
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
        'FLASH_ENGINE_RETRY_ENQUEUE_FAILED',
      )

      console.error(
        serializeStructuredRuntimeEvent({
          event:
            'flash.engine.retry-enqueue',

          component:
            'flash-engine-retry-failed-cli',

          status:
            'failed',

          data: {
            errorCode:
              'FLASH_ENGINE_RETRY_ENQUEUE_FAILED',
          },
        }),
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
