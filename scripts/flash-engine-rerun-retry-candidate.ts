import {
  requeueFlashEngineRetryCandidateRun,
} from '@/lib/flash/jobs/requeueFlashEngineRetryCandidateRun'

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
      'Flash Engine controlled retry-candidate rerun enqueue',
      '',
      'Usage:',
      '  pnpm exec tsx scripts/flash-engine-rerun-retry-candidate.ts \\',
      '    --run-record-id <flash-engine-run-record-id> \\',
      '    --allow-job-write \\',
      '    --allow-provider-requests',
      '',
      'Behavior:',
      '  - verifies one completed Flash Engine audit run by record ID',
      '  - requires at least one audited retryCandidate disposition',
      '  - requires the current queue-compatible Anthropic provider',
      '  - preserves the source audit run unchanged',
      '  - queues a fresh equivalent job, or reuses an untouched equivalent pending job',
      '  - does NOT run the queued job',
      '  - does NOT call Anthropic during enqueue',
      '  - does NOT enable Payload automatic retries',
      '',
      'Safety:',
      '  - job writes require --allow-job-write',
      '  - provider-capable jobs require --allow-provider-requests',
      '  - enqueue is restricted to the configured Railway STAGING target',
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

  const runRecordId =
    positiveIntegerArgument(
      '--run-record-id',
    )

  const result =
    await requeueFlashEngineRetryCandidateRun({
      payloadFactory:
        createPayload,

      runRecordId,

      allowJobWrite:
        hasFlag(
          '--allow-job-write',
        ),

      allowProviderRequests:
        hasFlag(
          '--allow-provider-requests',
        ),
    })

  console.log(
    'FLASH_ENGINE_RETRY_CANDIDATE_ENQUEUE_OK',
  )

  console.log({
    sourceRunRecordId:
      result.sourceRunRecordId,

    sourceRunId:
      result.sourceRunId,

    sourceDecision:
      result.sourceDecision,

    retryJobId:
      result.retryJobId,

    flashId:
      result.flashId,

    provider:
      result.provider,

    model:
      result.model,

    reusedExisting:
      result.reusedExisting,
  })

  console.log(
    serializeStructuredRuntimeEvent({
      event:
        'flash.engine.retry-candidate-enqueue',

      component:
        'flash-engine-rerun-retry-candidate-cli',

      status:
        'success',

      correlationId:
        'flash-engine-job:' +
        String(
          result.retryJobId,
        ),

      data: {
        sourceRunRecordId:
          result.sourceRunRecordId,

        sourceRunId:
          result.sourceRunId,

        sourceDecision:
          result.sourceDecision,

        retryJobId:
          result.retryJobId,

        flashId:
          result.flashId,

        provider:
          result.provider,

        model:
          result.model,

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
        'FLASH_ENGINE_RETRY_CANDIDATE_ENQUEUE_FAILED',
      )

      console.error(
        serializeStructuredRuntimeEvent({
          event:
            'flash.engine.retry-candidate-enqueue',

          component:
            'flash-engine-rerun-retry-candidate-cli',

          status:
            'failed',

          data: {
            errorCode:
              'FLASH_ENGINE_RETRY_CANDIDATE_ENQUEUE_FAILED',
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
