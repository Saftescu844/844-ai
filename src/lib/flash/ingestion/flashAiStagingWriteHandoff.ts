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
  type FlashAiStagingWriteInput,
} from './flashAiStagingWriteInput'

function parseOptionalTargetLanguage(
  value: unknown,
): FlashTargetLanguage | null {
  if (value === undefined) {
    return null
  }

  if (
    value === 'ro' ||
    value === 'en'
  ) {
    return value
  }

  throw new Error(
    'FlashAI STAGING write handoff targetLanguage must be "ro" or "en".',
  )
}

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

  const explicitTargetLanguage =
    parseOptionalTargetLanguage(
      value.targetLanguage,
    )

  const writeInput =
    buildFlashAiStagingWriteInput({
      candidate:
        candidate as unknown as FlashNormalizedArticleCandidate,

      readiness:
        readiness as unknown as FlashArticlePersistenceReadiness,
    })

  if (
    explicitTargetLanguage !== null &&
    explicitTargetLanguage !==
      writeInput.projection.limba
  ) {
    throw new Error(
      'FlashAI STAGING write handoff target language does not match persistence readiness.',
    )
  }

  if (
    writeInput.projection.limba === 'en' &&
    explicitTargetLanguage !== 'en'
  ) {
    throw new Error(
      'FlashAI STAGING EN write handoff requires explicit targetLanguage "en".',
    )
  }

  return writeInput
}
