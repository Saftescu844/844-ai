import {
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  normalizeFlashHtmlArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import {
  evaluateFlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'
import {
  buildFlashArticleCandidateFingerprints,
} from '@/lib/flash/ingestion/articleCandidateSourceFingerprint'
import {
  evaluateExplicitGroundedEventIdentity,
} from '@/lib/flash/ingestion/explicitGroundedEventIdentity'
import {
  buildFlashGroundedEventFingerprint,
} from '@/lib/flash/ingestion/groundedEventFingerprint'
import {
  evaluateFlashArticlePrePersistenceDedupReadOnly,
} from '@/lib/flash/ingestion/payloadArticleCandidatePrePersistenceDedupReadOnly'
import {
  extractFlashHtmlArticle,
} from '@/lib/flash/ingestion/htmlArticleExtraction'
import {
  retrieveFlashSource,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'
import {
  evaluateFlashSourceVerification,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'

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
Flash Engine HTML article pre-persistence dedup preview

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-html-article-prepersistence-dedup-preview.ts \
    --source-id 4 \
    --article-url https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting

Behavior:
  - reads one active source with allowIngestion=true
  - retrieves one same-host /en/news/... article
  - runs canonical technical source verification on the registered/concrete/final URLs and retrieval result
  - source verification confirms source identity/retrieval/content availability; it does NOT verify factual truth
  - extracts the REG-001K article fields
  - normalizes them into the REG-001L candidate contract
  - computes the deterministic REG-001N sourceFingerprint from the canonical URL
  - evaluates explicit CVE / DOI: / CELEX: identifiers from title, lead, and body
  - only one unique explicit identifier in title/lead can ground event identity
  - body-only identifiers or multiple primary identifiers keep event identity pending/ambiguous
  - a grounded event identity produces deterministic flash-event:v1 eventFingerprint
  - no title/date/URL/fuzzy/embedding/model-derived event identity is created
  - checks the candidate read-only against existing FlashAI records
  - checks canonical source URL reuse, grounded eventFingerprint reuse, sourceFingerprint reuse, and same-language normalized title matches
  - a grounded eventFingerprint is fed into pre-persistence dedup only when event identity is grounded
  - without a grounded eventFingerprint final pre-persistence dedup remains pending
  - sourceFingerprint reuse remains only a review signal
  - evaluates REG-001R persistence readiness from source verification, dedup evidence, and grounded fingerprints
  - reports source-grounded values, deferred editorial/classification decisions, blockers, and review signals
  - REG-001R never permits FlashAI create(); canCreateFlashAiDraft remains false until later stages provide classification and generated editorial content
  - does NOT call Anthropic
  - does NOT create, update, or delete FlashAI
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
        'Flash HTML article pre-persistence dedup preview is restricted to the configured read-only STAGING target.',
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
        `flash-html-prepersistence-dedup:${source.id}`,
      registeredSourceUrl:
        source.url,
      concreteUrl:
        articleUrl,
    })

  const sourceVerification =
    evaluateFlashSourceVerification([
      {
        id:
          `source:${source.id}`,
        registeredSourceUrl:
          source.url,
        concreteUrl:
          articleUrl,
        finalUrl:
          retrieval.candidate
            .finalUrl,
        retrieved:
          retrieval.candidate
            .retrieved,
        contentAvailable:
          retrieval.candidate
            .contentAvailable,
      },
    ])

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

  const sourceFingerprints =
    buildFlashArticleCandidateFingerprints(
      normalized,
    )

  const eventIdentity =
    evaluateExplicitGroundedEventIdentity(
      normalized,
    )

  const groundedEventFingerprint =
    eventIdentity.status === 'grounded' &&
    eventIdentity.identity
      ? buildFlashGroundedEventFingerprint(
          eventIdentity.identity,
        )
      : null

  const fingerprints = {
    sourceFingerprint:
      sourceFingerprints.sourceFingerprint,
    eventFingerprint:
      groundedEventFingerprint
        ?.eventFingerprint ??
      null,
    eventFingerprintStatus:
      groundedEventFingerprint
        ?.eventFingerprintStatus ??
      'pending',
  }

  const dedup =
    await evaluateFlashArticlePrePersistenceDedupReadOnly(
      payload,
      normalized,
      {
        eventFingerprint:
          fingerprints.eventFingerprint,
        sourceFingerprint:
          fingerprints.sourceFingerprint,
      },
    )

  const persistenceReadiness =
    evaluateFlashArticlePersistenceReadiness({
      candidate:
        normalized,
      sourceVerification,
      dedup:
        dedup.evidence,
      sourceFingerprint:
        fingerprints.sourceFingerprint,
      eventFingerprint:
        fingerprints.eventFingerprint,
    })

  console.log(
    'FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_OK',
  )

  console.log({
    candidate: {
      sourceId:
        normalized.sourceId,
      sourceName:
        normalized.sourceName,
      language:
        normalized.language,
      canonicalUrl:
        normalized.canonicalUrl,
      title:
        normalized.title,
      sourcePublicationDate:
        normalized.sourcePublicationDate,
    },
    sourceVerification,
    eventIdentity,
    fingerprints,
    candidateCount:
      dedup.candidateCount,
    evidence:
      dedup.evidence,
    persistenceReadiness,
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
        'FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_FAILED',
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
