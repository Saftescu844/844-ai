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
   * REG-001R intentionally stops before Payload create().
   * A FlashAI draft must not be created until classification and
   * original Flash editorial content are available.
   */
  canCreateFlashAiDraft: false

  sourceGroundedValues:
    FlashPersistenceSourceGroundedValues

  draftControls:
    FlashPersistenceDraftControls

  deferredDecisions: [
    'editorial_title',
    'pilon',
    'flash_type',
    'information_status',
    'risk_level',
    'health_classification',
    'editorial_content',
  ]

  blockers: FlashPersistenceReadinessBlocker[]
  reviewSignals: FlashPersistenceReviewSignal[]

  evidence: {
    sourceVerificationPassed: boolean
    sourceDuplicateFound: boolean
    eventFingerprintDuplicateFound: boolean
    sourceFingerprintReviewSignal: boolean
    titleReviewSignal: boolean
    finalDedupPending: boolean
  }
}

export interface FlashArticlePersistenceReadinessInput {
  candidate: FlashNormalizedArticleCandidate
  sourceVerification: FlashSourceVerificationEvidence
  dedup: FlashPrePersistenceDedupEvidence
  sourceFingerprint: string
  eventFingerprint?: string | null
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

  const blockers =
    new Set<FlashPersistenceReadinessBlocker>([
      'classification_required',
      'generated_flash_content_required',
    ])

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

    draftControls: {
      editorialStatus: 'draft',
      automationDecision: 'review',
      payloadStatus: 'draft',
    },

    deferredDecisions: [
      'editorial_title',
      'pilon',
      'flash_type',
      'information_status',
      'risk_level',
      'health_classification',
      'editorial_content',
    ],

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
    },
  }
}
