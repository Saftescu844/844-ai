import {
  spawnSync,
} from 'node:child_process'
import {
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises'
import {
  tmpdir,
} from 'node:os'
import {
  join,
} from 'node:path'

import {
  planFlashRssIngestionSources,
  parseFlashRssCandidates,
  type FlashRssCandidate,
} from '@/lib/flash/ingestion/rssCandidateIngestion'
import {
  fetchFlashRssFeedXml,
} from '@/lib/flash/ingestion/rssFeedRetriever'
import {
  buildFlashAiStagingWriteInputFromHandoffValue,
} from '@/lib/flash/ingestion/flashAiStagingWriteHandoff'
import {
  assertFlashAiProductionWriteAllowed,
} from '@/lib/flash/ingestion/flashAiProductionWriteGuard'
import {
  createFlashAiAtomicReviewPair,
} from '@/lib/flash/ingestion/payloadFlashAiAtomicReviewPairWriter'

const PRODUCTION_PROJECT_ID =
  '54c46ab1-ebab-491c-bdbe-571a3fce9ceb'

const PRODUCTION_ENVIRONMENT_ID =
  '12b22bbd-469f-4cb8-b418-cc2c8e40af6d'

const PRODUCTION_ONE_SHOT_SERVICE_NAME =
  'flash-rss-production-once'

const ALLOW_PRODUCTION_FLAG =
  '--allow-production-rss-one-shot'

const EXPECTED_SERVICE_ID_OPTION =
  '--expected-production-service-id'

const ALLOW_PROVIDER_FLAG =
  '--allow-provider-requests'

const DEFAULT_MAX_ITEMS =
  10

const MAX_ALLOWED_ITEMS =
  10

const DEFAULT_MAX_ATTEMPTS =
  1

const MAX_ALLOWED_ATTEMPTS =
  1

const CHILD_OUTPUT_LIMIT =
  20 * 1024 * 1024

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

function parseOptionalPositiveInteger(
  value: string | null,
  name: string,
): number | null {
  if (value === null) {
    return null
  }

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

function canonicalSelectionUrl(
  value: string,
): string | null {
  try {
    const url =
      new URL(
        value.trim(),
      )

    if (
      url.protocol !==
        'http:' &&
      url.protocol !==
        'https:'
    ) {
      return null
    }

    if (!url.hostname) {
      return null
    }

    url.search = ''
    url.hash = ''

    return url.toString()
  } catch {
    return null
  }
}

function publishedAtValue(
  value:
    string | null,
): number {
  if (!value) {
    return 0
  }

  const parsed =
    Date.parse(
      value,
    )

  return Number.isNaN(
    parsed,
  )
    ? 0
    : parsed
}

function printHelp(): void {
  console.log(`
Flash RSS production one-shot

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-rss-production one-shot.ts \\
    --model gpt-5.6-terra \\
    --allow-provider-requests \\
    --allow-production-rss-one-shot \\
    [--source-id 5] \\
    [--max-items 10] \\
    [--candidate-url https://example.com/article]

Behavior:
  - reads exactly one explicitly selected active allowIngestion=true RSS source (ID 5 or 6)
  - fetches at most 10 items per configured source
  - skips candidates whose source URL is already used by any FlashAI draft/published record
  - tries at most 3 newest remaining candidates per run
  - skips candidates without grounded event identity before provider calls
  - skips candidates blocked by strong duplicate evidence
  - generates and QA-checks RO and EN handoffs BEFORE any persistence
  - requires the same grounded event fingerprint for RO and EN
  - atomically creates both drafts, links them reciprocally, and moves both to editorial review
  - keeps automationDecision=review and _status=draft
  - does NOT publish or unpublish
  - does NOT enable allowAutoPublish
  - does NOT create a scheduler or cron job

Safety:
  - execution is restricted to the exact production Railway project/environment and service name flash-rss-production-once
  - RAILWAY_SERVICE_ID must match the explicit --expected-production-service-id
  - PAYLOAD_DB_PUSH must be exactly false
  - DATABASE_URL must resolve to the known PRODUCTION Supabase project
  - provider calls require --allow-provider-requests
  - persistence requires --allow-production-rss-one-shot
`)
}

function assertProductionOneShotEnvironment(
  expectedServiceId: string,
  environment:
    NodeJS.ProcessEnv =
      process.env,
): void {
  const mismatches:
    string[] = []

  if (
    environment
      .RAILWAY_PROJECT_ID !==
    PRODUCTION_PROJECT_ID
  ) {
    mismatches.push(
      'RAILWAY_PROJECT_ID',
    )
  }

  if (
    environment
      .RAILWAY_ENVIRONMENT_ID !==
    PRODUCTION_ENVIRONMENT_ID
  ) {
    mismatches.push(
      'RAILWAY_ENVIRONMENT_ID',
    )
  }

  if (
    environment
      .RAILWAY_SERVICE_NAME !==
    PRODUCTION_ONE_SHOT_SERVICE_NAME
  ) {
    mismatches.push(
      'RAILWAY_SERVICE_NAME',
    )
  }

  if (
    !expectedServiceId ||
    environment
      .RAILWAY_SERVICE_ID !==
    expectedServiceId
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
        'Flash RSS production one-shot is restricted to the dedicated PRODUCTION one-shot service.',
        `Environment mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }
}

type FlashRssCandidateSkipReason =
  | 'event_identity_not_grounded'
  | 'strong_duplicate'

class FlashRssCandidateSkipError
  extends Error {
  readonly reason:
    FlashRssCandidateSkipReason

  constructor(
    reason:
      FlashRssCandidateSkipReason,
    message: string,
  ) {
    super(
      message,
    )

    this.name =
      'FlashRssCandidateSkipError'

    this.reason =
      reason
  }
}

function runPrePersistenceHandoff({
  sourceId,
  articleUrl,
  targetLanguage,
  model,
  outputPath,
  expectedServiceId,
}: {
  sourceId: number
  articleUrl: string
  targetLanguage:
    'ro' | 'en'
  model: string
  outputPath: string
  expectedServiceId: string
}): void {
  const result =
    spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/flash-html-article-prepersistence-dedup-preview.ts',
        '--source-id',
        String(
          sourceId,
        ),
        '--article-url',
        articleUrl,
        '--target-language',
        targetLanguage,
        '--require-grounded-event-identity',
        '--allow-production-one-shot',
        '--expected-production-service-id',
        expectedServiceId,
        '--allow-provider-requests',
        '--model',
        model,
        '--handoff-output',
        outputPath,
      ],
      {
        cwd:
          process.cwd(),
        env:
          process.env,
        encoding:
          'utf8',
        maxBuffer:
          CHILD_OUTPUT_LIMIT,
      },
    )

  if (
    result.status !==
    0
  ) {
    const stderr =
      result.stderr
        ?.trim()
        .slice(
          -8_000,
        )

    const stdout =
      result.stdout
        ?.trim()
        .slice(
          -8_000,
        )

    const combinedOutput =
      [
        stderr,
        stdout,
      ]
        .filter(
          Boolean,
        )
        .join(
          '\n',
        )

    if (
      combinedOutput.includes(
        'does not have a grounded event identity required by this flow',
      ) ||
      combinedOutput.includes(
        'requires grounded event identity or a safe review-only pending identity',
      )
    ) {
      throw new FlashRssCandidateSkipError(
        'event_identity_not_grounded',
        `Candidate has no grounded event identity: ${articleUrl}`,
      )
    }

    if (
      combinedOutput.includes(
        'strong duplicate evidence exists',
      )
    ) {
      throw new FlashRssCandidateSkipError(
        'strong_duplicate',
        `Candidate is blocked by strong duplicate evidence: ${articleUrl}`,
      )
    }

    throw new Error(
      [
        `Pre-persistence ${targetLanguage.toUpperCase()} handoff failed.`,
        stderr
          ? `stderr: ${stderr}`
          : '',
        stdout
          ? `stdout: ${stdout}`
          : '',
      ]
        .filter(
          Boolean,
        )
        .join(
          '\n',
        ),
    )
  }

  console.log(
    'FLASH_RSS_PRODUCTION_ONE_SHOT_HANDOFF_OK',
    {
      targetLanguage,
      sourceId,
      articleUrl,
    },
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

async function readHandoff(
  path: string,
): Promise<unknown> {
  const raw =
    await readFile(
      path,
      'utf8',
    )

  return JSON.parse(
    raw,
  ) as unknown
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

  const allowProduction =
    hasFlag(
      ALLOW_PRODUCTION_FLAG,
    )

  const allowProvider =
    hasFlag(
      ALLOW_PROVIDER_FLAG,
    )

  if (!allowProduction) {
    throw new Error(
      'Flash RSS production one-shot persistence is not explicitly approved.',
    )
  }

  if (!allowProvider) {
    throw new Error(
      'Flash RSS production one-shot provider requests are not explicitly approved.',
    )
  }

  const model =
    argument(
      '--model',
    )

  if (!model) {
    throw new Error(
      'Flash RSS production one-shot requires --model.',
    )
  }

  const expectedServiceId =
    argument(
      EXPECTED_SERVICE_ID_OPTION,
    )

  if (!expectedServiceId) {
    throw new Error(
      'Flash RSS production one-shot requires --expected-production-service-id.',
    )
  }

  assertProductionOneShotEnvironment(
    expectedServiceId,
  )

  assertFlashAiProductionWriteAllowed({
    allowWrite:
      true,
    databaseUrl:
      process.env
        .DATABASE_URL,
  })

  if (
    !process.env
      .OPENAI_API_KEY
      ?.trim()
  ) {
    throw new Error(
      'Flash RSS production one-shot requires OPENAI_API_KEY.',
    )
  }

  const sourceId =
    parseOptionalPositiveInteger(
      argument(
        '--source-id',
      ),
      '--source-id',
    )

  if (sourceId === null) {
    throw new Error(
      'Flash RSS production one-shot requires --source-id.',
    )
  }

  if (
    sourceId !== 5 &&
    sourceId !== 6
  ) {
    throw new Error(
      'Flash RSS production one-shot currently allows only source ID 5 or 6.',
    )
  }

  const requestedMaxItems =
    parseOptionalPositiveInteger(
      argument(
        '--max-items',
      ),
      '--max-items',
    )

  const maxItems =
    Math.min(
      requestedMaxItems ??
        DEFAULT_MAX_ITEMS,
      MAX_ALLOWED_ITEMS,
    )

  const requestedMaxAttempts =
    parseOptionalPositiveInteger(
      argument(
        '--max-attempts',
      ),
      '--max-attempts',
    )

  const maxAttempts =
    Math.min(
      requestedMaxAttempts ??
        DEFAULT_MAX_ATTEMPTS,
      MAX_ALLOWED_ATTEMPTS,
    )

  const requestedCandidateUrl =
    argument(
      '--candidate-url',
    )

  const normalizedRequestedCandidateUrl =
    requestedCandidateUrl
      ? canonicalSelectionUrl(
          requestedCandidateUrl,
        )
      : null

  if (
    requestedCandidateUrl &&
    !normalizedRequestedCandidateUrl
  ) {
    throw new Error(
      '--candidate-url must be a valid HTTP(S) URL.',
    )
  }

  if (!normalizedRequestedCandidateUrl) {
    throw new Error(
      'Flash RSS production one-shot requires --candidate-url.',
    )
  }

  const payload =
    await createPayload()

  const plans =
    await planFlashRssIngestionSources(
      payload,
    )

  const selectedPlans =
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
    selectedPlans.length === 0
  ) {
    throw new Error(
      'No active allowIngestion RSS-ready source found for --source-id.',
    )
  }

  if (
    selectedPlans.some(
      plan =>
        plan.allowAutoPublish ===
        true,
    )
  ) {
    throw new Error(
      'Flash RSS production one-shot requires allowAutoPublish=false on the selected source.',
    )
  }

  const discovered:
    FlashRssCandidate[] = []

  for (
    const plan of
      selectedPlans
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

    discovered.push(
      ...parsed.candidates,
    )
  }

  const existing =
    await payload.find({
      collection:
        'flash-ai',
      depth:
        0,
      draft:
        true,
      overrideAccess:
        true,
      pagination:
        false,
    })

  const existingSourceUrls =
    new Set(
      existing.docs.flatMap(
        flash =>
          (flash.surseFlash ?? [])
            .map(
              source =>
                canonicalSelectionUrl(
                  source.url,
                ),
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value,
                ),
            ),
      ),
    )

  const candidates =
    discovered
      .filter(
        candidate => {
          const canonicalUrl =
            canonicalSelectionUrl(
              candidate.concreteUrl,
            )

          if (!canonicalUrl) {
            return false
          }

          if (
            normalizedRequestedCandidateUrl &&
            canonicalUrl !==
              normalizedRequestedCandidateUrl
          ) {
            return false
          }

          return !existingSourceUrls.has(
            canonicalUrl,
          )
        },
      )
      .sort(
        (
          a,
          b,
        ) => {
          const dateDifference =
            publishedAtValue(
              b.publishedAt,
            ) -
            publishedAtValue(
              a.publishedAt,
            )

          if (
            dateDifference !==
            0
          ) {
            return dateDifference
          }

          if (
            a.sourceId !==
            b.sourceId
          ) {
            return (
              a.sourceId -
              b.sourceId
            )
          }

          return a.concreteUrl
            .localeCompare(
              b.concreteUrl,
            )
        },
      )

  if (
    candidates.length ===
    0
  ) {
    console.log(
      'FLASH_RSS_PRODUCTION_ONE_SHOT_EMPTY',
    )

    console.log({
      selectedSourceCount:
        selectedPlans.length,
      discoveredCount:
        discovered.length,
      existingSourceUrlCount:
        existingSourceUrls.size,
      requestedCandidateUrl:
        normalizedRequestedCandidateUrl,
    })

    return
  }

  const candidateAttempts =
    candidates.slice(
      0,
      maxAttempts,
    )

  for (
    const [
      attemptIndex,
      candidate,
    ] of
      candidateAttempts
        .entries()
  ) {
    console.log(
      'FLASH_RSS_PRODUCTION_ONE_SHOT_SELECTED',
    )

    console.log({
      attempt:
        attemptIndex + 1,
      maxAttempts,
      sourceId:
        candidate.sourceId,
      sourceName:
        candidate.sourceName,
      title:
        candidate.title,
      articleUrl:
        candidate.concreteUrl,
      publishedAt:
        candidate.publishedAt,
    })

    const workDir =
      await mkdtemp(
        join(
          tmpdir(),
          '844-ai-flash-rss-production-one-shot-',
        ),
      )

    const roPath =
      join(
        workDir,
        'ro.json',
      )

    const enPath =
      join(
        workDir,
        'en.json',
      )

    try {
      runPrePersistenceHandoff({
        sourceId:
          candidate.sourceId,
        articleUrl:
          candidate.concreteUrl,
        targetLanguage:
          'ro',
        model,
        outputPath:
          roPath,
        expectedServiceId,
      })

      runPrePersistenceHandoff({
        sourceId:
          candidate.sourceId,
        articleUrl:
          candidate.concreteUrl,
        targetLanguage:
          'en',
        model,
        outputPath:
          enPath,
        expectedServiceId,
      })

      const [
        roHandoff,
        enHandoff,
      ] =
        await Promise.all([
          readHandoff(
            roPath,
          ),
          readHandoff(
            enPath,
          ),
        ])

      const ro =
        buildFlashAiStagingWriteInputFromHandoffValue(
          roHandoff,
        )

      const en =
        buildFlashAiStagingWriteInputFromHandoffValue(
          enHandoff,
        )

      const result =
        await createFlashAiAtomicReviewPair({
          payload,
          ro,
          en,
        })

      console.log(
        'FLASH_RSS_PRODUCTION_ONE_SHOT_OK',
      )

      console.log({
        sourceId:
          candidate.sourceId,
        sourceName:
          candidate.sourceName,
        articleUrl:
          candidate.concreteUrl,
        roId:
          result.roId,
        enId:
          result.enId,
        eventFingerprint:
          result.eventFingerprint,
        sourceFingerprint:
          result.sourceFingerprint,
        editorialStatus:
          'review',
        automationDecision:
          'review',
        status:
          'draft',
        published:
          false,
      })

      return
    } catch (error) {
      if (
        error instanceof
          FlashRssCandidateSkipError
      ) {
        console.log(
          'FLASH_RSS_PRODUCTION_ONE_SHOT_SKIPPED',
        )

        console.log({
          attempt:
            attemptIndex + 1,
          sourceId:
            candidate.sourceId,
          sourceName:
            candidate.sourceName,
          articleUrl:
            candidate.concreteUrl,
          reason:
            error.reason,
        })

        continue
      }

      throw error
    } finally {
      await rm(
        workDir,
        {
          recursive:
            true,
          force:
            true,
        },
      )
    }
  }

  console.log(
    'FLASH_RSS_PRODUCTION_ONE_SHOT_NO_ELIGIBLE_CANDIDATE',
  )

  console.log({
    attemptedCount:
      candidateAttempts.length,
    maxAttempts,
    discoveredCount:
      discovered.length,
    requestedCandidateUrl:
      normalizedRequestedCandidateUrl,
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
        'FLASH_RSS_PRODUCTION_ONE_SHOT_FAILED',
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
