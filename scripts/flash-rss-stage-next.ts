import { parseInstitutionalHtmlCandidates } from '@/lib/flash/ingestion/institutionalHtmlDiscovery'
import type { RssSourceDiscoveryPhase } from '@/lib/flash/ingestion/rssSourceDiscoveryDiagnostic'
import { filterFlashRssFreshCandidates, parseFlashRssMaxAgeDays } from '@/lib/flash/ingestion/flashPublicationFreshness'
import { observeEditorialDiagnostic } from '@/lib/flash/ingestion/editorialSelectionDiagnostic'
import { diagnoseRssHandoffFailure } from '@/lib/flash/ingestion/rssHandoffFailureDiagnostic'
import { FlashRssControlledFailure, FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'
import { installFlashRssShutdown, runFlashRssChild } from '@/lib/flash/audit/flashRssShutdown'

let diagnostics: FlashRssRunDiagnostics | undefined
let shutdown: ReturnType<typeof installFlashRssShutdown> | undefined
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
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'
import {
  filterFlashRssCandidatesWithinDailySourceBudgets,
  limitFlashRssEligibleCandidates,
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
  assertFlashAiStagingWriteAllowed,
} from '@/lib/flash/ingestion/flashAiStagingWriteGuard'
import {
  createFlashAiAtomicReviewPair,
} from '@/lib/flash/ingestion/payloadFlashAiAtomicReviewPairWriter'
import {
  activeFlashRssCandidateSkipUrls,
  canonicalFlashRssCandidateUrl,
  rememberFlashRssCandidateSkip,
  type FlashRssCandidateSkipReason,
} from '@/lib/flash/ingestion/rssCandidateSkipMemory'
import {
  isFlashRssArticleRetrievalHttpFailure,
  isFlashRssArticleUnsupportedLayoutFailure,
  isFlashRssMicrosoftPaperEvidenceUnavailable,
  runFlashRssStageNextAttempts,
} from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'

const ONE_SHOT_SERVICE_ID =
  '7be51b73-dc87-4a53-9ad4-879c00aecad6'

const FLASH_ENGINE_WORKER_SERVICE_ID =
  'd479e8ea-00a4-4b58-87a0-fc3221f4679c'

const ALLOWED_STAGING_SERVICE_IDS =
  new Set([
    ONE_SHOT_SERVICE_ID,
    FLASH_ENGINE_WORKER_SERVICE_ID,
  ])

const ALLOW_STAGE_FLAG =
  '--allow-staging-rss-stage-next'

const ALLOW_PROVIDER_FLAG =
  '--allow-provider-requests'

const DEFAULT_MAX_ITEMS =
  10

const MAX_ALLOWED_ITEMS =
  10

const DEFAULT_MAX_ATTEMPTS =
  3

const MAX_ALLOWED_ATTEMPTS =
  3

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
Flash RSS stage-next

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-rss-stage-next.ts \\
    --model gpt-5.6-terra \\
    --allow-provider-requests \\
    --allow-staging-rss-stage-next \\
    [--source-id 5] \\
    [--max-age-days 30] \
    [--max-items 10] \\
    [--candidate-url https://example.com/article]

Behavior:
  - reads active allowIngestion=true RSS sources and explicitly supported institutional HTML listings
  - examines at most 50 feed entries per source before known/rejected URL filtering
  - retains at most --max-items eligible candidates per source, within its configured limit
  - skips candidates whose source URL is already used by any FlashAI draft/published record
  - rejects missing, invalid, future and older-than-30-day dates before AI (reduce with --max-age-days 1..30)
  - rechecks the extracted article publication date before AI; --candidate-url does not bypass freshness
  - tries at most 3 newest remaining candidates per run
  - allows pending event identity only through the existing safe review-only bridge; otherwise fails closed
  - skips candidates blocked by strong duplicate evidence
  - remembers quality-filter rejections for 7 days so later runs advance to other candidates
  - generates and QA-checks RO and EN handoffs BEFORE any persistence
  - requires the same grounded event fingerprint for RO and EN
  - atomically creates both drafts, links them reciprocally, and moves both to editorial review
  - keeps automationDecision=review and _status=draft
  - does NOT publish or unpublish
  - does NOT enable allowAutoPublish
  - does NOT create a scheduler or cron job

Safety:
  - execution is restricted to the dedicated Railway STAGING one-shot service or flash-engine-worker
  - PAYLOAD_DB_PUSH must be exactly false
  - DATABASE_URL must resolve to the known STAGING Supabase project
  - provider calls require --allow-provider-requests
  - persistence requires --allow-staging-rss-stage-next
`)
}

function assertStageNextEnvironment(
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
    !environment
      .RAILWAY_SERVICE_ID ||
    !ALLOWED_STAGING_SERVICE_IDS
      .has(
        environment
          .RAILWAY_SERVICE_ID,
      )
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
        'Flash RSS stage-next is restricted to the dedicated STAGING one-shot service or flash-engine-worker.',
        `Environment mismatch: ${mismatches.join(', ')}.`,
      ].join(
        ' ',
      ),
    )
  }
}

type FlashRssCandidateTransientSkipReason =
  | 'article_publication_not_current'
  | 'editorial_output_too_short'
  | 'editorial_output_too_long'
  | 'article_retrieval_http_error'
  | 'article_layout_not_supported'
  | 'article_primary_evidence_unavailable'

class FlashRssCandidateTransientSkipError
  extends Error {
  readonly reason:
    FlashRssCandidateTransientSkipReason

  constructor(
    reason:
      FlashRssCandidateTransientSkipReason,
    message: string,
  ) {
    super(
      message,
    )

    this.name =
      'FlashRssCandidateTransientSkipError'

    this.reason =
      reason
  }
}

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

async function runPrePersistenceHandoff({
  sourceId,
  articleUrl,
  targetLanguage,
  model,
  outputPath,
  classificationHandoffPath,
  freshnessPolicy,
}: {
  sourceId: number
  articleUrl: string
  targetLanguage:
    'ro' | 'en'
  model: string
  outputPath: string
  classificationHandoffPath?: string
  freshnessPolicy: { now: number; maxAgeDays: number }
}): Promise<void> {
  const result =
    await runFlashRssChild(
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
        '--allow-provider-requests',
        '--staging-mit-evidence-preflight',
        '--model',
        model,
        '--rss-freshness-now', new Date(freshnessPolicy.now).toISOString(),
        '--rss-max-age-days', String(freshnessPolicy.maxAgeDays),
        '--handoff-output',
        outputPath,
        ...(classificationHandoffPath ? ['--classification-handoff-input', classificationHandoffPath] : []),
      ],
      {
        cwd:
          process.cwd(),
        env:
          process.env,
        signal: shutdown!.signal,
        maxBuffer:
          CHILD_OUTPUT_LIMIT,
      },
    )

  if (result.error?.code === 'ENOBUFS') throw new FlashRssControlledFailure('RSS_CHILD_OUTPUT_LIMIT')
  if (result.signal) throw new FlashRssControlledFailure('RSS_CHILD_SIGNAL')
  observeEditorialDiagnostic(result.stdout, metadata => diagnostics?.editorialDiagnostic(metadata))

  if (
    result.status !==
    0 || result.error
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

    diagnostics?.handoffFailure(diagnoseRssHandoffFailure(combinedOutput))

    if (isFlashRssMicrosoftPaperEvidenceUnavailable(combinedOutput)) {
      throw new FlashRssCandidateTransientSkipError('article_primary_evidence_unavailable', 'Primary publication page could not be verified.')
    }

    if (isFlashRssArticleUnsupportedLayoutFailure(combinedOutput)) {
      throw new FlashRssCandidateTransientSkipError('article_layout_not_supported', 'Article template is not supported by its source adapter.')
    }

    if (/^FLASH_RSS_FRESHNESS_REJECTED:(?:too_old|missing_date|invalid_date|future_date)$/m.test(combinedOutput)) {
      throw new FlashRssCandidateTransientSkipError('article_publication_not_current', 'Article publication date is outside the RSS freshness policy.')
    }

    // The child reports only bounded diagnostic categories and counts.
    // Do not print raw HTML, source text, arbitrary stderr or provider output.
    const mitDiagnosticLine =
      stdout
        ?.split(/\r?\n/)
        .find(line =>
          /^FLASH_MIT_PRIMARY_EVIDENCE_DIAGNOSTIC status=(?:supported_primary_link|unsupported_labelled_link|ambiguous_paper_links|missing_paper_label) labelledLinks=\d{1,4} ambiguousParagraphs=\d{1,4} recognizedEvidence=\d{1,4} identityStatus=(?:pending|ambiguous) providerCalled=false$/.test(line),
        )

    if (mitDiagnosticLine) {
      console.log(mitDiagnosticLine)
    }

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

    const transientEditorialReason:
      FlashRssCandidateTransientSkipReason | null =
      combinedOutput.includes(
        'invalid_output_too_short',
      )
        ? 'editorial_output_too_short'
        : combinedOutput.includes(
              'invalid_output_too_long',
            )
          ? 'editorial_output_too_long'
          : null

    if (
      isFlashRssArticleRetrievalHttpFailure(
        combinedOutput,
      )
    ) {
      throw new FlashRssCandidateTransientSkipError(
        'article_retrieval_http_error',
        `Candidate article retrieval failed temporarily: ${articleUrl}`,
      )
    }

    if (transientEditorialReason) {
      throw new FlashRssCandidateTransientSkipError(
        transientEditorialReason,
        `Candidate editorial output failed the word-count gate: ${articleUrl}`,
      )
    }

    throw new FlashRssControlledFailure('RSS_HANDOFF_FAILED')
  }

  console.log(
    'FLASH_RSS_STAGE_NEXT_HANDOFF_OK',
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

  shutdown = installFlashRssShutdown()
  diagnostics = new FlashRssRunDiagnostics(console.log, Date.now, process.env.RAILWAY_DEPLOYMENT_ID)

  const allowStage =
    hasFlag(
      ALLOW_STAGE_FLAG,
    )

  const allowProvider =
    hasFlag(
      ALLOW_PROVIDER_FLAG,
    )

  if (!allowStage) {
    throw new Error(
      'Flash RSS stage-next persistence is not explicitly approved.',
    )
  }

  if (!allowProvider) {
    throw new Error(
      'Flash RSS stage-next provider requests are not explicitly approved.',
    )
  }

  const model =
    argument(
      '--model',
    )

  if (!model) {
    throw new Error(
      'Flash RSS stage-next requires --model.',
    )
  }

  const maxAgeOption = argument('--max-age-days')
  if (hasFlag('--max-age-days') && maxAgeOption === null) throw new Error('--max-age-days requires a value.')
  const freshnessPolicy = { now: Date.now(), maxAgeDays: parseFlashRssMaxAgeDays(maxAgeOption) }

  assertStageNextEnvironment()

  assertFlashAiStagingWriteAllowed({
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
      'Flash RSS stage-next requires OPENAI_API_KEY.',
    )
  }

  const sourceId =
    parseOptionalPositiveInteger(
      argument(
        '--source-id',
      ),
      '--source-id',
    )

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
      ? canonicalFlashRssCandidateUrl(
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

  await diagnostics.checkpoint('database')
  const payload =
    await createPayload()

  await diagnostics.start(payload, model, process.env.RAILWAY_GIT_COMMIT_SHA ?? 'flash-rss-diagnostics-v1')
  shutdown.assertRunning()
  await diagnostics.checkpoint('source-planning')

  const plans =
    await planFlashRssIngestionSources(
      payload,
      { includeHtml: true },
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

  const candidateSkipMemoryBySourceId =
    new Map(
      selectedPlans.map(
        plan => [
          plan.sourceId,
          plan.candidateSkipMemory,
        ] as const,
      ),
    )

  const activeSkippedUrlsBySourceId =
    new Map(
      selectedPlans.map(
        plan => [
          plan.sourceId,
          activeFlashRssCandidateSkipUrls(
            plan.candidateSkipMemory,
          ),
        ] as const,
      ),
    )

  const rememberedRejectedUrlCount =
    Array.from(
      activeSkippedUrlsBySourceId.values(),
    ).reduce(
      (total, urls) =>
        total + urls.size,
      0,
    )

  const discovered:
    FlashRssCandidate[] = []

  for (
    const plan of
      selectedPlans
  ) {
    shutdown.assertRunning()
    if (!plan.feedUrl) {
      continue
    }

    await diagnostics.checkpoint('feed-retrieval', plan.sourceId)
    let discoveryPhase: RssSourceDiscoveryPhase = 'retrieval'
    try {
      const document = await fetchFlashRssFeedXml({ feedUrl: plan.feedUrl,
        registeredSourceUrl: plan.registeredSourceUrl,
        documentType: plan.discoveryMethod === 'html' ? 'html' : 'rss' })
      discoveryPhase = 'parsing'
      if (plan.discoveryMethod === 'html') {
        discovered.push(...parseInstitutionalHtmlCandidates(plan, document))
      } else {
        const parsed = await parseFlashRssCandidates(plan, document, { maxItems: 50, scanBeforeEligibility: true })
        discovered.push(...parsed.candidates)
      }
    } catch (error) {
      // A source refusal or layout failure must not stop other registered sources.
      diagnostics.sourceDiscoveryFailed(plan.sourceId, error, discoveryPhase)
    }
  }

  shutdown.assertRunning()
  if (selectedPlans.length > 0 && diagnostics.allSourcesFailed(selectedPlans.length)) {
    throw new FlashRssControlledFailure('RSS_ALL_SOURCES_FAILED')
  }

  await diagnostics.checkpoint('candidate-selection', null)
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
                canonicalFlashRssCandidateUrl(
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

  let filteredExistingCandidateCount = 0
  let filteredRememberedRejectedCandidateCount = 0

  const eligibleBeforeDailyBudget =
    discovered
      .filter(
        candidate => {
          const canonicalUrl =
            canonicalFlashRssCandidateUrl(
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

          if (
            existingSourceUrls.has(
              canonicalUrl,
            )
          ) {
            filteredExistingCandidateCount += 1
            return false
          }

          if (
            activeSkippedUrlsBySourceId
              .get(
                candidate.sourceId,
              )
              ?.has(
                canonicalUrl,
              )
          ) {
            filteredRememberedRejectedCandidateCount += 1
            return false
          }

          return true
        },
      )

  const freshnessResult = filterFlashRssFreshCandidates(eligibleBeforeDailyBudget, freshnessPolicy)

  const dailyBudgetResult =
    filterFlashRssCandidatesWithinDailySourceBudgets(
      freshnessResult.candidates,
      selectedPlans,
      existing.docs,
    )

  const filteredDailyBudgetCandidateCount =
    dailyBudgetResult
      .filteredCount

  const sortedEligibleCandidates =
    dailyBudgetResult
      .candidates
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

  const scanLimitResult = limitFlashRssEligibleCandidates(
    sortedEligibleCandidates, selectedPlans, maxItems,
  )
  const candidates = scanLimitResult.candidates
  const filteredScanLimitCandidateCount = scanLimitResult.filteredCount

  diagnostics.freshness(freshnessPolicy, freshnessResult)
  diagnostics.scan({ selectedSourceCount: selectedPlans.length, discoveredCount: discovered.length,
    eligibleCandidateCount: candidates.length, filteredExistingCandidateCount,
    filteredRememberedRejectedCandidateCount, filteredDailyBudgetCandidateCount, filteredScanLimitCandidateCount,
    existingSourceUrlCount: existingSourceUrls.size,
    rememberedRejectedUrlCount })

  if (
    candidates.length ===
    0
  ) {
    shutdown.assertRunning()
    diagnostics.result('empty')
    console.log(
      'FLASH_RSS_STAGE_NEXT_EMPTY',
    )

    console.log({
      selectedSourceCount:
        selectedPlans.length,
      discoveredCount:
        discovered.length,
      existingSourceUrlCount:
        existingSourceUrls.size,
      rememberedRejectedUrlCount,
      eligibleCandidateCount:
        candidates.length,
      filteredExistingCandidateCount,
      filteredRememberedRejectedCandidateCount,
      filteredDailyBudgetCandidateCount,
      requestedCandidateUrl:
        normalizedRequestedCandidateUrl,
    })

    return
  }

  const attemptResult =
    await runFlashRssStageNextAttempts({
      candidates,
      maxAttempts,
      processCandidate: async (
        candidate,
        attempt,
      ) => {
    shutdown!.assertRunning()
    diagnostics!.candidate(attempt, candidate.sourceId)
    const attemptIndex =
      attempt - 1
    console.log(
      'FLASH_RSS_STAGE_NEXT_SELECTED',
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
          '844-ai-flash-rss-stage-next-',
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
      await diagnostics!.checkpoint('generation-ro')
      await runPrePersistenceHandoff({
        sourceId:
          candidate.sourceId,
        articleUrl:
          candidate.concreteUrl,
        targetLanguage:
          'ro',
        model,
        outputPath:
          roPath,
        freshnessPolicy,
      })

      await diagnostics!.checkpoint('generation-en')
      await runPrePersistenceHandoff({
        sourceId:
          candidate.sourceId,
        articleUrl:
          candidate.concreteUrl,
        targetLanguage:
          'en',
        model,
        outputPath:
          enPath,
        classificationHandoffPath: roPath,
        freshnessPolicy,
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

      await diagnostics!.checkpoint('pair-persistence')
      shutdown!.assertRunning()
      const result =
        await createFlashAiAtomicReviewPair({
          payload,
          ro,
          en,
          allowPendingEventIdentityReviewPair:
            true,
        })

      diagnostics!.result('pair-created', result)
      console.log(
        'FLASH_RSS_STAGE_NEXT_OK',
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

      return 'complete'
    } catch (error) {
      if (
        error instanceof
          FlashRssCandidateTransientSkipError &&
        error.reason !== 'editorial_output_too_short'
      ) {
        diagnostics!.skipped(error.reason)
        console.log(
          'FLASH_RSS_STAGE_NEXT_SKIP_TRANSIENT',
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

        return 'skip'
      }

      if (
        error instanceof
          FlashRssCandidateSkipError ||
        error instanceof FlashRssCandidateTransientSkipError &&
          error.reason === 'editorial_output_too_short'
      ) {
        diagnostics!.skipped(error.reason)
        const nextMemory =
          rememberFlashRssCandidateSkip({
            value:
              candidateSkipMemoryBySourceId.get(
                candidate.sourceId,
              ),
            url:
              candidate.concreteUrl,
            reason:
              error instanceof FlashRssCandidateSkipError ? error.reason : 'editorial_output_too_short',
          })

        await payload.update({
          collection:
            'surse',
          id:
            candidate.sourceId,
          data: {
            rssCandidateSkipMemory:
              nextMemory,
          },
          overrideAccess:
            true,
        })

        candidateSkipMemoryBySourceId.set(
          candidate.sourceId,
          nextMemory,
        )

        activeSkippedUrlsBySourceId.set(
          candidate.sourceId,
          activeFlashRssCandidateSkipUrls(
            nextMemory,
          ),
        )

        diagnostics!.setRememberedRejectedUrlCount(
          Array.from(
            activeSkippedUrlsBySourceId.values(),
          ).reduce(
            (total, urls) =>
              total + urls.size,
            0,
          ),
        )

        console.log(
          'FLASH_RSS_STAGE_NEXT_SKIP_REMEMBERED',
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

        return 'skip'
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
      },
    })

  if (attemptResult.completed) {
    return
  }

  shutdown.assertRunning()
  diagnostics.result('no-eligible-candidate')
  console.log(
    'FLASH_RSS_STAGE_NEXT_NO_ELIGIBLE_CANDIDATE',
  )

  console.log({
    attemptedCount:
      attemptResult.attemptedCount,
    maxAttempts,
    discoveredCount:
      discovered.length,
    eligibleCandidateCount:
      candidates.length,
    filteredExistingCandidateCount,
    filteredRememberedRejectedCandidateCount,
    rememberedRejectedUrlCount:
      Array.from(
        activeSkippedUrlsBySourceId.values(),
      ).reduce(
        (total, urls) =>
          total + urls.size,
        0,
      ),
    requestedCandidateUrl:
      normalizedRequestedCandidateUrl,
  })

}

main()
  .then(async () => {
    await diagnostics?.finish()
    shutdown?.dispose()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    // Never emit arbitrary child stderr, raw provider responses or credentials.
    try {
      await diagnostics?.finish(true, error instanceof FlashRssControlledFailure ? error.code : undefined)
    } catch {
      // The diagnostic writer already emitted its bounded fallback error code.
    }
    console.error('FLASH_RSS_STAGE_NEXT_FAILED')
    shutdown?.dispose()
    process.exit(1)
  })
