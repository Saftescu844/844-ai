import {
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  planFlashRssIngestionSources,
} from '@/lib/flash/ingestion/rssCandidateIngestion'

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function printHelp(): void {
  console.log(`
Flash Engine RSS ingestion readiness

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-ingestion-plan.ts

Behavior:
  - reads only active sources with allowIngestion=true
  - reports whether each source has a usable HTTP(S) RSS feed configured
  - does NOT fetch any feed
  - does NOT call Anthropic
  - does NOT create or update FlashAI
  - does NOT queue jobs
  - does NOT publish or unpublish

Safety:
  - execution is restricted to the configured Railway STAGING main service
  - PAYLOAD_DB_PUSH must be exactly false
`)
}

function assertReadOnlyStagingTarget(
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
    mismatches.length >
    0
  ) {
    throw new Error(
      [
        'Flash ingestion readiness is restricted to the configured read-only STAGING target.',
        `Environment mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }
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

  assertReadOnlyStagingTarget()

  const payload =
    await createPayload()

  const sources =
    await planFlashRssIngestionSources(
      payload,
    )

  const readyCount =
    sources.filter(
      source =>
        source.ready,
    ).length

  console.log(
    'FLASH_INGESTION_PLAN_OK',
  )

  console.log({
    sourceCount:
      sources.length,
    readyCount,
    blockedCount:
      sources.length -
      readyCount,
    sources,
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
        'FLASH_INGESTION_PLAN_FAILED',
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
