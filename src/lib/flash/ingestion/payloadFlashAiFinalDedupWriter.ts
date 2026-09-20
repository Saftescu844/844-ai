import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

import type {
  FlashAiDraftProjection,
} from './articleCandidateFlashAiDraftProjection'

import {
  evaluateFlashArticlePrePersistenceDedupReadOnly,
} from './payloadArticleCandidatePrePersistenceDedupReadOnly'

import {
  createFlashAiDraft,
} from './payloadFlashAiDraftWriter'

export type FlashAiFinalDedupWriterPayload =
  Pick<
    Payload,
    'find' | 'create'
  >

export interface CreateFlashAiDraftWithFinalDedupGuardInput {
  payload:
    FlashAiFinalDedupWriterPayload

  candidate:
    FlashNormalizedArticleCandidate

  projection:
    FlashAiDraftProjection
}

/**
 * Performs the last read-only dedup check immediately
 * before draft persistence.
 *
 * The write is allowed only when:
 * - canonical source URL is not already present
 * - grounded event fingerprint is not already present
 * - grounded event identity is complete
 */
export async function createFlashAiDraftWithFinalDedupGuard({
  payload,
  candidate,
  projection,
}: CreateFlashAiDraftWithFinalDedupGuardInput): Promise<
  FlashAi
> {
  const projectionPrimarySource =
    projection.surseFlash.find(
      source =>
        source.primary === true,
    )

  if (
    projectionPrimarySource?.url == null ||
    projectionPrimarySource.url !==
      candidate.canonicalUrl
  ) {
    throw new Error(
      'FlashAI final pre-write dedup guard requires matching candidate and projection source.',
    )
  }

  const finalDedup =
    await evaluateFlashArticlePrePersistenceDedupReadOnly(
      payload,
      candidate,
      {
        eventFingerprint:
          projection.eventFingerprint,

        sourceFingerprint:
          projection.sourceFingerprint,

        targetLanguage:
          projection.limba,
      },
    )

  if (
    finalDedup.evidence
      .sourceDuplicateFound ||
    finalDedup.evidence
      .eventFingerprintDuplicateFound ||
    finalDedup.evidence
      .finalDedupPending
  ) {
    throw new Error(
      'FlashAI final pre-write dedup guard blocked persistence.',
    )
  }

  return await createFlashAiDraft({
    payload,
    projection,
  })
}
