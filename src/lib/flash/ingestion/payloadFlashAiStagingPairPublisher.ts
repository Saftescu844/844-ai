import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

import {
  FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT,
} from '@/lib/flash/ingestion/flashAiAuthorizedPublicationContext'

export type FlashAiStagingPairPublisherPayload =
  Pick<
    Payload,
    'findByID' | 'update' | 'db'
  >

export interface PublishFlashAiStagingPairInput {
  payload:
    FlashAiStagingPairPublisherPayload

  roId:
    number

  enId:
    number
}

export interface PublishFlashAiStagingPairResult {
  roId:
    number

  enId:
    number

  eventFingerprint:
    string

  roPublishedAt:
    string

  enPublishedAt:
    string
}

function normalizeFingerprint(
  value:
    string | null | undefined,
): string | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase()

  return normalized
    ? normalized
    : null
}

function relationshipId(
  value:
    FlashAi['versiuneAlternativa'],
): number | null {
  if (
    typeof value ===
    'number'
  ) {
    return value
  }

  if (
    value &&
    typeof value ===
      'object' &&
    typeof value.id ===
      'number'
  ) {
    return value.id
  }

  return null
}

function assertPublishablePair(
  ro:
    FlashAi,
  en:
    FlashAi,
  roId:
    number,
  enId:
    number,
): string {
  if (
    ro.limba !== 'ro' ||
    en.limba !== 'en'
  ) {
    throw new Error(
      'FlashAI staging pair publish requires RO and EN documents in the declared order.',
    )
  }

  if (
    ro._status !== 'draft' ||
    en._status !== 'draft'
  ) {
    throw new Error(
      'FlashAI staging pair publish requires two draft documents.',
    )
  }

  if (
    ro.editorialStatus !== 'review' ||
    en.editorialStatus !== 'review'
  ) {
    throw new Error(
      'FlashAI staging pair publish requires both documents to be in editorial review.',
    )
  }

  if (
    ro.automationDecision !== 'review' ||
    en.automationDecision !== 'review'
  ) {
    throw new Error(
      'FlashAI staging pair publish requires automationDecision=review for both documents.',
    )
  }

  if (
    ro.publishedAt ||
    en.publishedAt
  ) {
    throw new Error(
      'FlashAI staging pair publish refuses documents that already have publishedAt.',
    )
  }

  if (
    relationshipId(
      ro.versiuneAlternativa,
    ) !== enId ||
    relationshipId(
      en.versiuneAlternativa,
    ) !== roId
  ) {
    throw new Error(
      'FlashAI staging pair publish requires reciprocal RO/EN alternative links.',
    )
  }

  const roEventFingerprint =
    normalizeFingerprint(
      ro.eventFingerprint,
    )

  const enEventFingerprint =
    normalizeFingerprint(
      en.eventFingerprint,
    )

  if (
    !roEventFingerprint ||
    !enEventFingerprint ||
    roEventFingerprint !==
      enEventFingerprint
  ) {
    throw new Error(
      'FlashAI staging pair publish requires the same grounded event fingerprint.',
    )
  }

  if (
    !ro.excerpt?.trim() ||
    !en.excerpt?.trim()
  ) {
    throw new Error(
      'FlashAI staging pair publish requires non-empty excerpts in both languages.',
    )
  }

  return roEventFingerprint
}

function latestDraftAsPublishedData(
  document:
    FlashAi,
) {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    publishedAt: _publishedAt,
    _status: _status,
    ...editable
  } = document

  return {
    ...editable,
    _status:
      'published' as const,
  }
}

function assertPublishedResult(
  document:
    FlashAi,
  expectedId:
    number,
): string {
  if (
    document.id !== expectedId ||
    document._status !== 'published' ||
    document.editorialStatus !== 'approved' ||
    !document.publishedAt
  ) {
    throw new Error(
      `FlashAI ${expectedId} did not reach the expected published state.`,
    )
  }

  return document.publishedAt
}

/**
 * Atomically publishes one reviewed RO/EN FlashAI pair in staging.
 *
 * Safety contract:
 * - explicit RO/EN order;
 * - latest draft version is read and becomes the published payload;
 * - both documents must still be review/draft and unpublished;
 * - reciprocal alternative links and eventFingerprint must match;
 * - both writes share one Payload transaction;
 * - any failure rolls both documents back.
 */
export async function publishFlashAiStagingPair({
  payload,
  roId,
  enId,
}: PublishFlashAiStagingPairInput): Promise<
  PublishFlashAiStagingPairResult
> {
  if (
    roId === enId
  ) {
    throw new Error(
      'FlashAI staging pair publish does not allow self-pairing.',
    )
  }

  const transactionID =
    await payload.db
      .beginTransaction()

  if (
    transactionID === null ||
    transactionID === undefined
  ) {
    throw new Error(
      'FlashAI staging pair publish requires transaction support.',
    )
  }

  try {
    const req = {
      transactionID,
    }

    const [
      ro,
      en,
    ] =
      await Promise.all([
        payload.findByID({
          collection:
            'flash-ai',

          id:
            roId,

          depth:
            0,

          draft:
            true,

          overrideAccess:
            true,

          req,
        }),

        payload.findByID({
          collection:
            'flash-ai',

          id:
            enId,

          depth:
            0,

          draft:
            true,

          overrideAccess:
            true,

          req,
        }),
      ])

    const eventFingerprint =
      assertPublishablePair(
        ro,
        en,
        roId,
        enId,
      )

    const roPublished =
      await payload.update({
        collection:
          'flash-ai',

        id:
          roId,

        data:
          latestDraftAsPublishedData(
            ro,
          ),

        draft:
          false,

        overrideAccess:
          true,

        context:
          FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT,

        req,
      })

    const enPublished =
      await payload.update({
        collection:
          'flash-ai',

        id:
          enId,

        data:
          latestDraftAsPublishedData(
            en,
          ),

        draft:
          false,

        overrideAccess:
          true,

        context:
          FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT,

        req,
      })

    const roPublishedAt =
      assertPublishedResult(
        roPublished,
        roId,
      )

    const enPublishedAt =
      assertPublishedResult(
        enPublished,
        enId,
      )

    await payload.db
      .commitTransaction(
        transactionID,
      )

    return {
      roId,
      enId,
      eventFingerprint,
      roPublishedAt,
      enPublishedAt,
    }
  } catch (error) {
    await payload.db
      .rollbackTransaction(
        transactionID,
      )

    throw error
  }
}
