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

function canPersistSafePendingEventIdentityDraft({
  candidate,
  projection,
  finalDedup,
}: {
  candidate:
    FlashNormalizedArticleCandidate

  projection:
    FlashAiDraftProjection

  finalDedup:
    Awaited<
      ReturnType<
        typeof evaluateFlashArticlePrePersistenceDedupReadOnly
      >
    >
}): boolean {
  const evidence =
    finalDedup.evidence

  if (
    projection.eventFingerprint !==
      null ||
    !evidence.finalDedupPending
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
    projection.editorialStatus !==
      'draft' ||
    projection.automationDecision !==
      'review' ||
    projection._status !==
      'draft' ||
    projection.generatAutomat !==
      true
  ) {
    return false
  }

  return (
    !evidence.sourceDuplicateFound &&
    !evidence.eventFingerprintDuplicateFound &&
    !evidence.sourceFingerprintReviewSignal &&
    !evidence.titleReviewSignal
  )
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

  const canPersistPendingEventIdentity =
    canPersistSafePendingEventIdentityDraft({
      candidate,
      projection,
      finalDedup,
    })

  if (
    finalDedup.evidence
      .sourceDuplicateFound ||
    finalDedup.evidence
      .eventFingerprintDuplicateFound ||
    (
      finalDedup.evidence
        .finalDedupPending &&
      !canPersistPendingEventIdentity
    )
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
