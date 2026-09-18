import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from './articleCandidatePersistenceReadiness'

import {
  buildFlashAiStagingWriteInput,
  type FlashAiStagingWriteInput,
} from './flashAiStagingWriteInput'

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      'object' &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  )
}

/**
 * Converts an external handoff value into the only
 * accepted STAGING write input.
 *
 * A prebuilt projection is deliberately forbidden.
 * Projection must always be derived internally from
 * persistence readiness.
 */
export function buildFlashAiStagingWriteInputFromHandoffValue(
  value: unknown,
): FlashAiStagingWriteInput {
  if (!isRecord(value)) {
    throw new Error(
      'FlashAI STAGING write handoff must be an object.',
    )
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'projection',
    )
  ) {
    throw new Error(
      'FlashAI STAGING write handoff does not accept a prebuilt projection.',
    )
  }

  const candidate =
    value.candidate

  const readiness =
    value.readiness

  if (!isRecord(candidate)) {
    throw new Error(
      'FlashAI STAGING write handoff requires candidate.',
    )
  }

  if (!isRecord(readiness)) {
    throw new Error(
      'FlashAI STAGING write handoff requires persistence readiness.',
    )
  }

  return buildFlashAiStagingWriteInput({
    candidate:
      candidate as unknown as FlashNormalizedArticleCandidate,

    readiness:
      readiness as unknown as FlashArticlePersistenceReadiness,
  })
}
