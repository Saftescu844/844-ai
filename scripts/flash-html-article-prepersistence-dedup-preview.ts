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
  extractFlashSupportingPolicySemanticMaterial,
  type FlashSupportingPolicySemanticMaterial,
} from '@/lib/flash/ingestion/supportingPolicySemanticMaterial'
import {
  FLASH_MAX_SUPPORTING_SOURCES,
  evaluateFlashVerifiedSupportingSourcePack,
} from '@/lib/flash/ingestion/verifiedSupportingSourcePack'
import {
  retrieveFlashSource,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'
import {
  evaluateFlashSourceVerification,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'
import {
  createOpenAiFlashPrePersistenceClassificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/openAiPrePersistenceClassificationSemanticProducer'
import {
  createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer,
} from '@/lib/flash/semanticEvidence/openAiPrePersistenceEditorialGenerationSemanticProducer'
import {
  createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from '@/lib/flash/semanticEvidence/openAiPrePersistenceEditorialQualityReviewSemanticProducer'
import {
  runFlashPrePersistenceClassificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticProducer'
import {
  countFlashEditorialWords,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'
import {
  runFlashPrePersistenceEditorialGenerationSemanticProducer,
  type FlashPrePersistenceEditorialGenerationRunMetadata,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'
import {
  evaluateFlashPrePersistenceEditorialQualityGate,
  type FlashPrePersistenceEditorialQualityGateResult,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityGate'
import {
  runFlashPrePersistenceEditorialQualityReviewSemanticProducer,
  type FlashPrePersistenceEditorialQualityReviewRunMetadata,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewSemanticProducer'

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
Flash Engine HTML article pre-persistence dedup preview

Usage:
  PAYLOAD_DB_PUSH=false pnpm exec tsx scripts/flash-html-article-prepersistence-dedup-preview.ts \
    --source-id 4 \
    --article-url https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting \
    [--supporting-url https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai] \
    [--supporting-url https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice] \
    [--allow-provider-requests --model gpt-5.6-terra]

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
  - evaluates persistence readiness from source verification, dedup evidence, grounded fingerprints, and optional validated classification
  - reports source-grounded values, classification, deferred decisions, blockers, and review signals
  - REG-001S classification and REG-001T editorial generation/QA are NOT requested by default
  - with --allow-provider-requests and --model, resolves allowed pilons from the source configuration and requests bounded OpenAI classification first
  - provider classification runs only after source verification passes and no canonical/event duplicate blocker exists
  - successful strict REG-001S classification removes classification_required from persistence readiness
  - accepts zero, one, or two explicit --supporting-url values; zero preserves the original REG-001T primary-only path
  - when supporting URLs are supplied, retrieves them through the canonical retriever and requires the REG-001U verified supporting-source pack contract to pass
  - deterministically extracts bounded supporting policy semantic material only after the supporting pack passes
  - after successful classification, requests one original Romanian REG-001T editorial draft using the same primary source candidate, validated classification, and optional verified supporting materials
  - the generated Romanian editorial must satisfy the strict 500–1000-word contract or the preview fails closed
  - after successful generation, runs one bounded source-fidelity / Romanian QA pass against the same primary + supporting source set and classification
  - QA may return a shorter source-faithful diagnostic editorial rather than inventing or padding material to force the canonical minimum
  - a deterministic post-QA gate reports whether the reviewed editorial satisfies the canonical 500–1000-word and basic structural bridge requirements
  - REG-001T generation, QA, and quality-gate outputs are preview-only and are intentionally NOT fed back into persistenceReadiness yet
  - generated_flash_content_required therefore remains in persistence readiness until a later explicit integration increment
  - does NOT create, update, or delete FlashAI
  - does NOT queue or run jobs
  - does NOT publish or unpublish

Safety:
  - execution is restricted to the configured Railway STAGING main service
  - PAYLOAD_DB_PUSH must be exactly false
  - OPENAI_API_KEY is read only after explicit --allow-provider-requests and a non-empty --model
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
    supportingUrls.length >
      FLASH_MAX_SUPPORTING_SOURCES
  ) {
    throw new Error(
      `Provide at most ${String(FLASH_MAX_SUPPORTING_SOURCES)} --supporting-url values.`,
    )
  }

  const allowProviderRequests =
    hasFlag(
      '--allow-provider-requests',
    )

  const model =
    readOption(
      '--model',
    )
      ?.trim() ??
    null

  if (
    allowProviderRequests &&
    !model
  ) {
    throw new Error(
      '--model is required when --allow-provider-requests is set.',
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

  let supportingPolicySemanticMaterials:
    FlashSupportingPolicySemanticMaterial[] = []

  let supportingSourcePack:
    | null
    | {
        requestedUrls: string[]
        acceptableForSemanticUse: boolean
        reasons: string[]
        supportingSources: Array<{
          id: string
          sourceUrl: string
          title: string
          semanticTextLength: number
          semanticWordCount: number
        }>
      } = null

  if (
    supportingUrls.length >
    0
  ) {
    const supportingRetrievals =
      await Promise.all(
        supportingUrls.map(
          (
            supportingUrl,
            index,
          ) =>
            retrieveFlashSource({
              id:
                `flash-html-prepersistence-supporting:${String(source.id)}:${String(index + 1)}`,
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
          normalized.canonicalUrl,
        supportingSources:
          supportingRetrievals.map(
            supportingRetrieval => ({
              ...supportingRetrieval.candidate,
              textContent:
                supportingRetrieval.textContent,
            }),
          ),
      })

    if (!pack.acceptableForSemanticUse) {
      throw new Error(
        `Supporting-source pack is not acceptable: ${pack.reasons.join(', ') || 'unknown_reason'}.`,
      )
    }

    supportingPolicySemanticMaterials =
      pack.sources.map(
        supportingSource =>
          extractFlashSupportingPolicySemanticMaterial(
            supportingSource,
          ),
      )

    supportingSourcePack = {
      requestedUrls:
        supportingUrls,
      acceptableForSemanticUse:
        pack.acceptableForSemanticUse,
      reasons:
        pack.reasons,
      supportingSources:
        supportingPolicySemanticMaterials.map(
          material => ({
            id:
              material.id,
            sourceUrl:
              material.sourceUrl,
            title:
              material.title,
            semanticTextLength:
              material.textLength,
            semanticWordCount:
              material.wordCount,
          }),
        ),
    }
  }

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

  let persistenceReadiness =
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

  let prePersistenceClassification:
    | null
    | {
        allowedPilons: Array<{
          id: number
          name: string
        }>
        classification: {
          pilonId: number
          flashType:
            | 'announcement'
            | 'research'
            | 'regulation'
            | 'product'
            | 'business'
            | 'incident'
            | 'update'
            | 'other'
          informationStatus:
            | 'official'
            | 'confirmed'
            | 'emerging'
            | 'preliminary'
            | 'disputed'
            | 'unverified'
          riskLevel:
            | 'low'
            | 'medium'
            | 'high'
          isHealthRelated: boolean
        }
        run: {
          stage:
            'prePersistenceClassification'
          method:
            'model'
          runId: string
          provider: string | null
          model: string | null
        }
      } = null

  let prePersistenceEditorialGeneration:
    | null
    | {
        editorial:
          FlashPrePersistenceEditorialGenerationSemanticOutput
        wordCount: number
        run:
          FlashPrePersistenceEditorialGenerationRunMetadata
      } = null

  let prePersistenceEditorialQualityReview:
    | null
    | {
        editorial:
          FlashPrePersistenceEditorialGenerationSemanticOutput
        wordCount: number
        run:
          FlashPrePersistenceEditorialQualityReviewRunMetadata
      } = null

  let prePersistenceEditorialQualityGate:
    FlashPrePersistenceEditorialQualityGateResult | null =
      null

  if (allowProviderRequests) {
    if (!model) {
      throw new Error(
        'OpenAI model is required.',
      )
    }

    if (
      !sourceVerification
        .sourceVerificationPassed
    ) {
      throw new Error(
        'Provider classification is blocked because source verification did not pass.',
      )
    }

    if (
      dedup.evidence
        .sourceDuplicateFound ||
      dedup.evidence
        .eventFingerprintDuplicateFound
    ) {
      throw new Error(
        'Provider classification is blocked because strong duplicate evidence exists.',
      )
    }

    const sourcePilonIds = [
      ...new Set(
        (source.pilon ?? [])
          .map(
            pilon =>
              typeof pilon ===
                'number'
                ? pilon
                : pilon.id,
          ),
      ),
    ]

    if (
      sourcePilonIds.length ===
      0
    ) {
      throw new Error(
        'Provider classification requires at least one source-configured pilon.',
      )
    }

    const allowedPilons =
      await Promise.all(
        sourcePilonIds.map(
          async pilonId => {
            const category =
              await payload.findByID({
                collection:
                  'categorii',
                id:
                  pilonId,
                depth:
                  0,
                overrideAccess:
                  true,
              })

            return {
              id:
                category.id,
              name:
                category.nume,
            }
          },
        ),
      )

    const apiKey =
      process.env
        .OPENAI_API_KEY
        ?.trim()

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not configured.',
      )
    }

    const openAiModule =
      await import(
        'openai'
      )

    const OpenAI =
      openAiModule.default

    const client =
      new OpenAI({
        apiKey,
      })

    const classificationProducer =
      createOpenAiFlashPrePersistenceClassificationSemanticProducer({
        client,
        model,
      })

    const classificationResult =
      await runFlashPrePersistenceClassificationSemanticProducer({
        producer:
          classificationProducer,
        input: {
          candidate:
            normalized,
          allowedPilons,
          runId:
            `flash-prepersistence-classification:${String(source.id)}:${fingerprints.sourceFingerprint.slice(0, 16)}`,
        },
      })

    if (!classificationResult.ok) {
      throw new Error(
        `Pre-persistence classification failed: ${classificationResult.reason}.`,
      )
    }

    prePersistenceClassification = {
      allowedPilons,
      classification:
        classificationResult.classification,
      run:
        classificationResult.run,
    }

    persistenceReadiness =
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
        validatedClassification:
          classificationResult.classification,
      })

    const editorialProducer =
      createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer({
        client,
        model,
      })

    const editorialResult =
      await runFlashPrePersistenceEditorialGenerationSemanticProducer({
        producer:
          editorialProducer,
        input: {
          candidate:
            normalized,
          classification:
            classificationResult.classification,
          supportingSources:
            supportingPolicySemanticMaterials,
          runId:
            `flash-prepersistence-editorial-ro:${String(source.id)}:${fingerprints.sourceFingerprint.slice(0, 16)}`,
        },
      })

    if (!editorialResult.ok) {
      throw new Error(
        `Pre-persistence editorial generation failed: ${editorialResult.reason}.`,
      )
    }

    prePersistenceEditorialGeneration = {
      editorial:
        editorialResult.editorial,
      wordCount:
        countFlashEditorialWords(
          editorialResult.editorial
            .editorialParagraphs,
        ),
      run:
        editorialResult.run,
    }

    const editorialQualityReviewProducer =
      createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer({
        client,
        model,
      })

    const editorialQualityReviewResult =
      await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
        producer:
          editorialQualityReviewProducer,
        input: {
          candidate:
            normalized,
          classification:
            classificationResult.classification,
          editorial:
            editorialResult.editorial,
          supportingSources:
            supportingPolicySemanticMaterials,
          runId:
            `flash-prepersistence-editorial-qa-ro:${String(source.id)}:${fingerprints.sourceFingerprint.slice(0, 16)}`,
        },
      })

    if (!editorialQualityReviewResult.ok) {
      const diagnostics =
        editorialQualityReviewResult
          .diagnostics

      const diagnosticSuffix =
        diagnostics
          ? ` Diagnostics: ${JSON.stringify(diagnostics)}.`
          : ''

      throw new Error(
        `Pre-persistence editorial quality review failed: ${editorialQualityReviewResult.reason}.${diagnosticSuffix}`,
      )
    }

    prePersistenceEditorialQualityReview = {
      editorial:
        editorialQualityReviewResult.editorial,
      wordCount:
        countFlashEditorialWords(
          editorialQualityReviewResult.editorial
            .editorialParagraphs,
        ),
      run:
        editorialQualityReviewResult.run,
    }

    prePersistenceEditorialQualityGate =
      evaluateFlashPrePersistenceEditorialQualityGate(
        editorialQualityReviewResult.editorial,
      )
  }

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
    supportingSourcePack,
    prePersistenceClassification,
    prePersistenceEditorialGeneration:
      prePersistenceEditorialGeneration
        ? {
            wordCount:
              prePersistenceEditorialGeneration
                .wordCount,
            run:
              prePersistenceEditorialGeneration
                .run,
          }
        : null,
    prePersistenceEditorialQualityReview:
      prePersistenceEditorialQualityReview
        ? {
            wordCount:
              prePersistenceEditorialQualityReview
                .wordCount,
            run:
              prePersistenceEditorialQualityReview
                .run,
          }
        : null,
    prePersistenceEditorialQualityGate,
  })

  if (
    prePersistenceEditorialGeneration
  ) {
    console.log(
      'FLASH_PREPERSISTENCE_EDITORIAL_GENERATION_RO',
    )
    console.log(
      JSON.stringify(
        prePersistenceEditorialGeneration,
        null,
        2,
      ),
    )
  }

  if (
    prePersistenceEditorialQualityReview
  ) {
    console.log(
      'FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_RO',
    )
    console.log(
      JSON.stringify(
        prePersistenceEditorialQualityReview,
        null,
        2,
      ),
    )
  }
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