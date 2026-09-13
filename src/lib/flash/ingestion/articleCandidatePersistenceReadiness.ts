import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from '../semanticEvidence/prePersistenceClassificationSemanticOutput'
import type {
  FlashSourceVerificationEvidence,
} from '../runtimeEvidence/sourceVerificationEvidence'
import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'
import type {
  FlashPrePersistenceDedupEvidence,
} from './articleCandidatePrePersistenceDedup'

export type FlashPersistenceReadinessBlocker =
  | 'source_verification_failed'
  | 'canonical_source_duplicate'
  | 'grounded_event_duplicate'
  | 'classification_required'
  | 'generated_flash_content_required'

export type FlashPersistenceReviewSignal =
  | 'source_fingerprint_match'
  | 'normalized_title_match'
  | 'event_identity_pending'

export type FlashPersistenceDeferredDecision =
  | 'editorial_title'
  | 'pilon'
  | 'flash_type'
  | 'information_status'
  | 'risk_level'
  | 'health_classification'
  | 'editorial_content'

export interface FlashPersistenceSourceGroundedValues {
  sourceId: number
  sourceName: string
  language: 'en'
  sourceTitle: string
  canonicalUrl: string
  sourcePublishedAt: string
  sourceFingerprint: string
  eventFingerprint: string | null
}

export interface FlashPersistenceDraftControls {
  editorialStatus: 'draft'
  automationDecision: 'review'
  payloadStatus: 'draft'
}

export interface FlashArticlePersistenceReadiness {
  /**
   * REG-001S still stops before Payload create().
   * Classification may now be present, but original generated Flash
   * editorial content is still required before a draft can be created.
   */
  canCreateFlashAiDraft: false

  sourceGroundedValues:
    FlashPersistenceSourceGroundedValues

  classification:
    FlashPrePersistenceClassificationSemanticOutput | null

  draftControls:
    FlashPersistenceDraftControls

  deferredDecisions:
    FlashPersistenceDeferredDecision[]

  blockers: FlashPersistenceReadinessBlocker[]
  reviewSignals: FlashPersistenceReviewSignal[]

  evidence: {
    sourceVerificationPassed: boolean
    sourceDuplicateFound: boolean
    eventFingerprintDuplicateFound: boolean
    sourceFingerprintReviewSignal: boolean
    titleReviewSignal: boolean
    finalDedupPending: boolean
    classificationAvailable: boolean
  }
}

export interface FlashArticlePersistenceReadinessInput {
  candidate: FlashNormalizedArticleCandidate
  sourceVerification: FlashSourceVerificationEvidence
  dedup: FlashPrePersistenceDedupEvidence
  sourceFingerprint: string
  eventFingerprint?: string | null

  /**
   * Must come from the strict REG-001S semantic parser/producer path.
   * This helper does not accept or repair raw provider output.
   */
  validatedClassification?:
    FlashPrePersistenceClassificationSemanticOutput | null
}

function normalizeFingerprint(
  value: string | null | undefined,
): string | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase()

  return normalized
    ? normalized
    : null
}

export function evaluateFlashArticlePersistenceReadiness(
  input: FlashArticlePersistenceReadinessInput,
): FlashArticlePersistenceReadiness {
  const {
    candidate,
    sourceVerification,
    dedup,
  } = input

  if (
    candidate.canonicalUrl !==
    dedup.candidateCanonicalUrl
  ) {
    throw new Error(
      'Flash persistence readiness candidate URL does not match dedup evidence.',
    )
  }

  const sourceFingerprint =
    normalizeFingerprint(
      input.sourceFingerprint,
    )

  if (!sourceFingerprint) {
    throw new Error(
      'Flash persistence readiness requires sourceFingerprint.',
    )
  }

  const eventFingerprint =
    normalizeFingerprint(
      input.eventFingerprint,
    )

  const classification =
    input.validatedClassification ??
    null

  const blockers =
    new Set<FlashPersistenceReadinessBlocker>([
      'generated_flash_content_required',
    ])

  if (!classification) {
    blockers.add(
      'classification_required',
    )
  }

  if (
    !sourceVerification
      .sourceVerificationPassed
  ) {
    blockers.add(
      'source_verification_failed',
    )
  }

  if (dedup.sourceDuplicateFound) {
    blockers.add(
      'canonical_source_duplicate',
    )
  }

  if (
    dedup.eventFingerprintDuplicateFound
  ) {
    blockers.add(
      'grounded_event_duplicate',
    )
  }

  const reviewSignals =
    new Set<FlashPersistenceReviewSignal>()

  if (
    dedup.sourceFingerprintReviewSignal
  ) {
    reviewSignals.add(
      'source_fingerprint_match',
    )
  }

  if (dedup.titleReviewSignal) {
    reviewSignals.add(
      'normalized_title_match',
    )
  }

  if (
    !eventFingerprint ||
    dedup.finalDedupPending
  ) {
    reviewSignals.add(
      'event_identity_pending',
    )
  }

  const deferredDecisions:
    FlashPersistenceDeferredDecision[] = [
      'editorial_title',
    ]

  if (!classification) {
    deferredDecisions.push(
      'pilon',
      'flash_type',
      'information_status',
      'risk_level',
      'health_classification',
    )
  }

  deferredDecisions.push(
    'editorial_content',
  )

  return {
    canCreateFlashAiDraft: false,

    sourceGroundedValues: {
      sourceId:
        candidate.sourceId,
      sourceName:
        candidate.sourceName,
      language:
        candidate.language,
      sourceTitle:
        candidate.title,
      canonicalUrl:
        candidate.canonicalUrl,
      sourcePublishedAt:
        candidate.sourcePublicationDate,
      sourceFingerprint,
      eventFingerprint,
    },

    classification,

    draftControls: {
      editorialStatus: 'draft',
      automationDecision: 'review',
      payloadStatus: 'draft',
    },

    deferredDecisions,

    blockers: [
      ...blockers,
    ],

    reviewSignals: [
      ...reviewSignals,
    ],

    evidence: {
      sourceVerificationPassed:
        sourceVerification
          .sourceVerificationPassed,
      sourceDuplicateFound:
        dedup.sourceDuplicateFound,
      eventFingerprintDuplicateFound:
        dedup
          .eventFingerprintDuplicateFound,
      sourceFingerprintReviewSignal:
        dedup
          .sourceFingerprintReviewSignal,
      titleReviewSignal:
        dedup.titleReviewSignal,
      finalDedupPending:
        dedup.finalDedupPending,
      classificationAvailable:
        classification !== null,
    },
  }
}
