import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from './articleCandidatePersistenceReadiness'

import type {
  FlashTargetLanguage,
} from './flashTargetLanguage'

import {
  buildFlashAiStagingWriteInput,
} from './flashAiStagingWriteInput'

export interface FlashAiStagingHandoffArtifact {
  /**
   * Explicit handoff intent.
   *
   * New artifacts always carry the target language so an
   * English write cannot be inferred only from nested data.
   */
  targetLanguage:
    FlashTargetLanguage

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
  const writeInput =
    buildFlashAiStagingWriteInput({
      candidate,
      readiness,
    })

  return {
    targetLanguage:
      writeInput.projection.limba,
    candidate,
    readiness,
  }
}
