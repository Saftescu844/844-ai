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

  if (
    !eventFingerprint ||
    readiness.evidence
      .finalDedupPending
  ) {
    throw new Error(
      'FlashAI STAGING write input requires grounded event identity.',
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
