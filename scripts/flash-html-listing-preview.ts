import {
  getPayload,
} from 'payload'

import config from '@payload-config'

import {
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  parseFlashHtmlListingCandidates,
} from '@/lib/flash/ingestion/htmlListingCandidateIngestion'

import {
  retrieveFlashSource,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function readOption(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index < 0 ||
    !process.argv[
      index + 1
    ]
  ) {
    return null
  }

  return process.argv[
    index + 1
  ] ?? null
}

function printHelp(): void {
  console.log(`
Flash Engine HTML listing preview

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-html-listing-preview.ts \
    --source-id 4 \
    --listing-url https://digital-strategy.ec.europa.eu/en/related-content?topic=119

Optional:
  --max-items 10

Behavior:
  - reads one active source with allowIngestion=true
  - retrieves one listing page from the registered source host
  - extracts only same-host /en/news/... links
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
        'Flash HTML listing preview is restricted to the configured read-only STAGING target.',
        `Environment mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }
}

function parsePositiveInteger(
  value: string | null,
  name: string,
): number {
  const parsed =
    Number(
      value,
    )

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer.`,
    )
  }

  return parsed
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

  const sourceId =
    parsePositiveInteger(
      readOption(
        '--source-id',
      ),
      '--source-id',
    )

  const listingUrl =
    readOption(
      '--listing-url',
    )

  if (!listingUrl) {
    throw new Error(
      '--listing-url is required.',
    )
  }

  const maxItemsValue =
    readOption(
      '--max-items',
    )

  const maxItems =
    maxItemsValue
      ? parsePositiveInteger(
          maxItemsValue,
          '--max-items',
        )
      : 10

  const payload =
    await getPayload({
      config,
    })

  const result =
    await payload.find({
      collection:
        'surse',
      depth:
        0,
      overrideAccess:
        true,
      limit:
        1,
      where: {
        and: [
          {
            id: {
              equals:
                sourceId,
            },
          },
          {
            activa: {
              equals:
                true,
            },
          },
          {
            allowIngestion: {
              equals:
                true,
            },
          },
        ],
      },
    })

  const source =
    result.docs[0]

  if (!source) {
    throw new Error(
      'No active allowIngestion source found for --source-id.',
    )
  }

  const retrieval =
    await retrieveFlashSource({
      id:
        `flash-html-listing:${source.id}`,
      registeredSourceUrl:
        source.url,
      concreteUrl:
        listingUrl,
    })

  if (
    !retrieval.candidate
      .retrieved ||
    !retrieval.candidate
      .contentAvailable ||
    !retrieval.textContent
  ) {
    throw new Error(
      `HTML listing retrieval failed: ${retrieval.failureReason ?? 'content_unavailable'}.`,
    )
  }

  const parsed =
    parseFlashHtmlListingCandidates(
      {
        sourceId:
          source.id,
        sourceName:
          source.nume,
        registeredSourceUrl:
          source.url,
        sourceRole:
          source.sourceRole,
        editorialTrust:
          source.editorialTrust,
        citationMode:
          source.citationMode,
        allowAutoPublish:
          source.allowAutoPublish ===
          true,
      },
      retrieval.candidate
        .finalUrl ??
        listingUrl,
      retrieval.textContent,
      {
        maxItems,
      },
    )

  console.log(
    'FLASH_HTML_LISTING_PREVIEW_OK',
  )

  console.log({
    sourceId:
      source.id,
    sourceName:
      source.nume,
    listingUrl:
      retrieval.candidate
        .finalUrl ??
      listingUrl,
    anchorsScanned:
      parsed.anchorsScanned,
    candidateCount:
      parsed.candidates.length,
    candidates:
      parsed.candidates,
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
        'FLASH_HTML_LISTING_PREVIEW_FAILED',
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
