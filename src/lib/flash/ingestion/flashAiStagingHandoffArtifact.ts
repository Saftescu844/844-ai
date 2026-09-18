import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from './articleCandidatePersistenceReadiness'

import {
  buildFlashAiStagingWriteInput,
} from './flashAiStagingWriteInput'

export interface FlashAiStagingHandoffArtifact {
  candidate:
    FlashNormalizedArticleCandidate

  readiness:
    FlashArticlePersistenceReadiness
}

/**
 * Builds the projection-free artifact that may cross the
 * boundary between read-only preparation and the separately
 * approved STAGING write command.
 *
 * The write-input builder is deliberately executed first so
 * the artifact cannot be produced unless the same candidate
 * and readiness are already acceptable for deterministic
 * STAGING persistence.
 */
export function buildFlashAiStagingHandoffArtifact({
  candidate,
  readiness,
}: {
  candidate:
    FlashNormalizedArticleCandidate

  readiness:
    FlashArticlePersistenceReadiness
}): FlashAiStagingHandoffArtifact {
  buildFlashAiStagingWriteInput({
    candidate,
    readiness,
  })

  return {
    candidate,
    readiness,
  }
}
