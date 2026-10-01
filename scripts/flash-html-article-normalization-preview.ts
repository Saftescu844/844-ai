import {
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  normalizeFlashHtmlArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import {
  extractFlashHtmlArticle,
} from '@/lib/flash/ingestion/htmlArticleExtraction'
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
Flash Engine HTML article normalization preview

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-html-article-normalization-preview.ts \
    --source-id 4 \
    --article-url https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting

Behavior:
  - reads one active source with allowIngestion=true
  - retrieves one same-host /en/news/... article
  - extracts the REG-001K article fields
  - normalizes them into the deterministic REG-001L candidate contract
  - does NOT generate fingerprints or run deduplication
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
        'Flash HTML article normalization preview is restricted to the configured read-only STAGING target.',
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

  const sourceId =
    parsePositiveInteger(
      readOption(
        '--source-id',
      ),
      '--source-id',
    )

  const articleUrl =
    readOption(
      '--article-url',
    )

  if (!articleUrl) {
    throw new Error(
      '--article-url is required.',
    )
  }

  const payload =
    await createPayload()

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
        `flash-html-normalization:${source.id}`,
      registeredSourceUrl:
        source.url,
      concreteUrl:
        articleUrl,
    })

  if (
    !retrieval.candidate
      .retrieved ||
    !retrieval.candidate
      .contentAvailable ||
    !retrieval.textContent
  ) {
    throw new Error(
      `HTML article retrieval failed: ${retrieval.failureReason ?? 'content_unavailable'}.`,
    )
  }

  const extracted =
    extractFlashHtmlArticle(
      source.url,
      retrieval.candidate
        .finalUrl ??
        articleUrl,
      retrieval.textContent,
    )

  const normalized =
    normalizeFlashHtmlArticleCandidate(
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
      extracted,
    )

  console.log(
    'FLASH_HTML_ARTICLE_NORMALIZATION_PREVIEW_OK',
  )

  console.log(
    normalized,
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
        'FLASH_HTML_ARTICLE_NORMALIZATION_PREVIEW_FAILED',
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
