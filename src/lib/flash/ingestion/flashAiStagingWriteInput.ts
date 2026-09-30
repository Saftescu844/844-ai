import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from './articleCandidatePersistenceReadiness'
import {
  resolveFlashTargetLanguage,
} from './flashTargetLanguage'

import {
  projectFlashAiDraftFromPersistenceReadiness,
  type FlashAiDraftProjection,
} from './articleCandidateFlashAiDraftProjection'

export interface FlashAiStagingWriteInput {
  candidate:
    FlashNormalizedArticleCandidate

  projection:
    FlashAiDraftProjection
}

function canBridgePendingEventIdentityAsSafeReviewDraft({
  candidate,
  readiness,
  eventFingerprint,
}: {
  candidate:
    FlashNormalizedArticleCandidate

  readiness:
    FlashArticlePersistenceReadiness

  eventFingerprint:
    string | null
}): boolean {
  if (eventFingerprint) {
    return false
  }

  if (
    !readiness.evidence
      .finalDedupPending
  ) {
    return false
  }

  if (
    candidate.sourceRole !==
      'primary' ||
    candidate.editorialTrust !==
      'high' ||
    candidate.allowAutoPublish !==
      false
  ) {
    return false
  }

  if (
    readiness.evidence
      .sourceDuplicateFound ||
    readiness.evidence
      .eventFingerprintDuplicateFound ||
    readiness.evidence
      .sourceFingerprintReviewSignal ||
    readiness.evidence
      .titleReviewSignal
  ) {
    return false
  }

  const reviewSignals =
    readiness.reviewSignals ??
    []

  return (
    reviewSignals.length ===
      1 &&
    reviewSignals[0] ===
      'event_identity_pending'
  )
}

/**
 * Builds the controlled STAGING persistence handoff.
 *
 * The final write boundary is stricter than persistence
 * readiness: grounded event identity is mandatory.
 */
export function buildFlashAiStagingWriteInput({
  candidate,
  readiness,
}: {
  candidate:
    FlashNormalizedArticleCandidate

  readiness:
    FlashArticlePersistenceReadiness
}): FlashAiStagingWriteInput {
  const eventFingerprint =
    readiness
      .sourceGroundedValues
      .eventFingerprint
      ?.trim()

  const hasGroundedEventIdentity =
    Boolean(
      eventFingerprint,
    ) &&
    !readiness.evidence
      .finalDedupPending

  const canBridgePendingEventIdentity =
    canBridgePendingEventIdentityAsSafeReviewDraft({
      candidate,
      readiness,
      eventFingerprint:
        eventFingerprint ??
        null,
    })

  if (
    !hasGroundedEventIdentity &&
    !canBridgePendingEventIdentity
  ) {
    throw new Error(
      'FlashAI STAGING write input requires grounded event identity or a safe review-only pending identity.',
    )
  }

  if (
    candidate.canonicalUrl !==
    readiness
      .sourceGroundedValues
      .canonicalUrl
  ) {
    throw new Error(
      'FlashAI STAGING write input candidate URL does not match persistence readiness.',
    )
  }

  if (
    candidate.sourceId !==
    readiness
      .sourceGroundedValues
      .sourceId
  ) {
    throw new Error(
      'FlashAI STAGING write input candidate source does not match persistence readiness.',
    )
  }

  const projection =
    projectFlashAiDraftFromPersistenceReadiness(
      readiness,
    )

  if (
    projection.limba !==
    resolveFlashTargetLanguage(
      readiness.targetLanguage,
    )
  ) {
    throw new Error(
      'FlashAI STAGING write input target language mismatch.',
    )
  }

  if (
    projection.eventFingerprint !==
    eventFingerprint
  ) {
    throw new Error(
      'FlashAI STAGING write input event fingerprint mismatch.',
    )
  }

  return {
    candidate,
    projection,
  }
}
