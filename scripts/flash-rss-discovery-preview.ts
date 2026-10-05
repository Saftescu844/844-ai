import {
  planFlashRssIngestionSources,
  parseFlashRssCandidates,
} from '@/lib/flash/ingestion/rssCandidateIngestion'
import {
  fetchFlashRssFeedXml,
} from '@/lib/flash/ingestion/rssFeedRetriever'

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

function printHelp(): void {
  console.log(`
Flash RSS discovery preview

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-rss-discovery-preview.ts \\
    [--source-id 5] \\
    [--max-items 10]

Behavior:
  - reads only active sources with allowIngestion=true
  - considers only RSS-ready sources
  - fetches the configured RSS feed over HTTPS
  - rejects cross-host redirects and oversized feeds
  - parses candidates with the existing RSS parser
  - does NOT call a model provider
  - does NOT create or update FlashAI
  - does NOT queue jobs
  - does NOT publish or unpublish

Safety:
  - restricted to the configured STAGING Railway project/environment
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
    '44c37d0f-b300-4462-b001-31259ddae5dd'
  ) {
    mismatches.push(
      'RAILWAY_PROJECT_ID',
    )
  }

  if (
    environment
      .RAILWAY_ENVIRONMENT_ID !==
    'a589dc28-1c59-468c-9eb4-351fce8fa17b'
  ) {
    mismatches.push(
      'RAILWAY_ENVIRONMENT_ID',
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
        'Flash RSS discovery preview is restricted to the configured read-only STAGING target.',
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

async function main(): Promise<void> {
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

  const sourceIdValue =
    readOption(
      '--source-id',
    )

  const sourceId =
    sourceIdValue
      ? parsePositiveInteger(
          sourceIdValue,
          '--source-id',
        )
      : null

  const maxItemsValue =
    readOption(
      '--max-items',
    )

  const maxItems =
    maxItemsValue
      ? Math.min(
          parsePositiveInteger(
            maxItemsValue,
            '--max-items',
          ),
          20,
        )
      : 10

  const payload =
    await createPayload()

  const plans =
    await planFlashRssIngestionSources(
      payload,
    )

  const selected =
    plans.filter(
      plan =>
        plan.ready &&
        (
          sourceId === null ||
          plan.sourceId ===
            sourceId
        ),
    )

  if (
    sourceId !== null &&
    selected.length === 0
  ) {
    throw new Error(
      'No active allowIngestion RSS-ready source found for --source-id.',
    )
  }

  const results:
    Array<{
      sourceId: number
      sourceName: string
      feedUrl: string
      totalItems: number
      skippedItems: number
      candidateCount: number
      candidates:
        Awaited<
          ReturnType<
            typeof parseFlashRssCandidates
          >
        >['candidates']
    }> = []

  for (
    const plan of
      selected
  ) {
    if (!plan.feedUrl) {
      continue
    }

    const xml =
      await fetchFlashRssFeedXml({
        feedUrl:
          plan.feedUrl,
        registeredSourceUrl:
          plan.registeredSourceUrl,
      })

    const parsed =
      await parseFlashRssCandidates(
        plan,
        xml,
        {
          maxItems,
        },
      )

    results.push({
      sourceId:
        plan.sourceId,
      sourceName:
        plan.sourceName,
      feedUrl:
        plan.feedUrl,
      totalItems:
        parsed.totalItems,
      skippedItems:
        parsed.skippedItems,
      candidateCount:
        parsed.candidates.length,
      candidates:
        parsed.candidates,
    })
  }

  console.log(
    'FLASH_RSS_DISCOVERY_PREVIEW_OK',
  )

  console.log({
    sourceCount:
      results.length,
    maxItems,
    results,
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
        'FLASH_RSS_DISCOVERY_PREVIEW_FAILED',
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
