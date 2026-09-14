import {
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  FLASH_MAX_SUPPORTING_SOURCES,
  evaluateFlashVerifiedSupportingSourcePack,
} from '@/lib/flash/ingestion/verifiedSupportingSourcePack'

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

function readOptions(
  name: string,
): string[] {
  const values:
    string[] = []

  for (
    let index = 0;
    index < process.argv.length;
    index += 1
  ) {
    if (
      process.argv[index] !==
      name
    ) {
      continue
    }

    const value =
      process.argv[
        index + 1
      ]

    if (
      !value ||
      value.startsWith(
        '--',
      )
    ) {
      continue
    }

    values.push(
      value,
    )
  }

  return values
}

function printHelp(): void {
  console.log(`
Flash Engine verified supporting-source pack preview

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-verified-supporting-source-pack-preview.ts \\
    --source-id 4 \\
    --article-url https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting \\
    --supporting-url https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai \\
    [--supporting-url https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice]

Behavior:
  - reads one active source with allowIngestion=true
  - requires one or two explicit --supporting-url values
  - retrieves every supporting URL through the canonical source retriever
  - applies the REG-001U verified supporting-source pack contract
  - supporting URLs must belong to the registered source identity
  - supporting URLs must be distinct from the primary article and each other
  - all supporting retrievals must pass technical source verification and contain text
  - prints only technical metadata and text lengths, never the full supporting bodies
  - does NOT discover sources autonomously
  - does NOT call any semantic provider
  - does NOT modify persistenceReadiness
  - does NOT create, update, or delete Payload documents
  - does NOT queue or run jobs
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
        'Flash supporting-source preview is restricted to the configured read-only STAGING target.',
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
      ?.trim() ??
    ''

  if (!articleUrl) {
    throw new Error(
      '--article-url is required.',
    )
  }

  const supportingUrls =
    readOptions(
      '--supporting-url',
    )
      .map(
        value =>
          value.trim(),
      )
      .filter(Boolean)

  if (
    supportingUrls.length < 1 ||
    supportingUrls.length >
      FLASH_MAX_SUPPORTING_SOURCES
  ) {
    throw new Error(
      `Provide between 1 and ${String(FLASH_MAX_SUPPORTING_SOURCES)} --supporting-url values.`,
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

  const retrievals =
    await Promise.all(
      supportingUrls.map(
        (
          supportingUrl,
          index,
        ) =>
          retrieveFlashSource({
            id:
              `flash-supporting-preview:${String(source.id)}:${String(index + 1)}`,
            registeredSourceUrl:
              source.url,
            concreteUrl:
              supportingUrl,
          }),
      ),
    )

  const pack =
    evaluateFlashVerifiedSupportingSourcePack({
      primaryCanonicalUrl:
        articleUrl,
      supportingSources:
        retrievals.map(
          retrieval => ({
            ...retrieval.candidate,
            textContent:
              retrieval.textContent,
          }),
        ),
    })

  const summary = {
    sourceId:
      source.id,
    sourceName:
      source.nume,
    registeredSourceUrl:
      source.url,
    primaryCanonicalUrl:
      articleUrl,
    requestedSupportingUrls:
      supportingUrls,
    acceptableForSemanticUse:
      pack.acceptableForSemanticUse,
    reasons:
      pack.reasons,
    verification:
      pack.verification,
    supportingSources:
      pack.sources.map(
        supportingSource => ({
          id:
            supportingSource.id,
          concreteUrl:
            supportingSource.concreteUrl,
          finalUrl:
            supportingSource.finalUrl,
          textLength:
            supportingSource.textContent.length,
        }),
      ),
  }

  console.log(
    'FLASH_VERIFIED_SUPPORTING_SOURCE_PACK_PREVIEW',
  )
  console.log(
    JSON.stringify(
      summary,
      null,
      2,
    ),
  )

  if (!pack.acceptableForSemanticUse) {
    throw new Error(
      `Supporting-source pack is not acceptable: ${pack.reasons.join(', ') || 'unknown_reason'}.`,
    )
  }

  console.log(
    'FLASH_VERIFIED_SUPPORTING_SOURCE_PACK_PREVIEW_OK',
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
        'FLASH_VERIFIED_SUPPORTING_SOURCE_PACK_PREVIEW_FAILED',
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
