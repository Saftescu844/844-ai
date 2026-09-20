import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

export type FlashAiReciprocalAlternativeLinkPayload =
  Pick<
    Payload,
    'findByID' | 'update' | 'db'
  >

export interface LinkFlashAiReciprocalAlternativesInput {
  payload:
    FlashAiReciprocalAlternativeLinkPayload

  roId:
    number

  enId:
    number
}

export interface LinkFlashAiReciprocalAlternativesResult {
  roId:
    number

  enId:
    number

  eventFingerprint:
    string

  updated:
    boolean
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

function assertDraftPair(
  ro:
    FlashAi,
  en:
    FlashAi,
): void {
  if (
    ro._status !== 'draft' ||
    en._status !== 'draft'
  ) {
    throw new Error(
      'FlashAI reciprocal alternative link requires two draft documents.',
    )
  }
}

function assertLanguages(
  ro:
    FlashAi,
  en:
    FlashAi,
): void {
  if (
    ro.limba !== 'ro' ||
    en.limba !== 'en'
  ) {
    throw new Error(
      'FlashAI reciprocal alternative link requires RO and EN documents in the declared order.',
    )
  }
}

function assertSameGroundedEvent(
  ro:
    FlashAi,
  en:
    FlashAi,
): string {
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
      'FlashAI reciprocal alternative link requires the same grounded event fingerprint.',
    )
  }

  return roEventFingerprint
}

function assertNoConflictingAlternative(
  document:
    FlashAi,
  expectedAlternativeId:
    number,
): void {
  const currentAlternativeId =
    relationshipId(
      document.versiuneAlternativa,
    )

  if (
    currentAlternativeId !== null &&
    currentAlternativeId !==
      expectedAlternativeId
  ) {
    throw new Error(
      'FlashAI reciprocal alternative link found a conflicting existing alternative.',
    )
  }
}

/**
 * Atomically links one Romanian and one English FlashAI
 * draft that represent the same grounded event.
 *
 * Safety contract:
 * - no self-link;
 * - RO and EN order is explicit;
 * - both documents must still be drafts;
 * - eventFingerprint must be present and identical;
 * - an existing relationship may be empty or already
 *   point to the expected sibling, never elsewhere;
 * - both updates share one Payload transaction.
 */
export async function linkFlashAiReciprocalAlternatives({
  payload,
  roId,
  enId,
}: LinkFlashAiReciprocalAlternativesInput): Promise<
  LinkFlashAiReciprocalAlternativesResult
> {
  if (roId === enId) {
    throw new Error(
      'FlashAI reciprocal alternative link does not allow self-linking.',
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
      'FlashAI reciprocal alternative link requires transaction support.',
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

    assertDraftPair(
      ro,
      en,
    )

    assertLanguages(
      ro,
      en,
    )

    const eventFingerprint =
      assertSameGroundedEvent(
        ro,
        en,
      )

    assertNoConflictingAlternative(
      ro,
      enId,
    )

    assertNoConflictingAlternative(
      en,
      roId,
    )

    const roAlternativeId =
      relationshipId(
        ro.versiuneAlternativa,
      )

    const enAlternativeId =
      relationshipId(
        en.versiuneAlternativa,
      )

    const alreadyReciprocal =
      roAlternativeId === enId &&
      enAlternativeId === roId

    if (!alreadyReciprocal) {
      await payload.update({
        collection:
          'flash-ai',

        id:
          roId,

        data: {
          versiuneAlternativa:
            enId,
        },

        draft:
          true,

        overrideAccess:
          true,

        req,
      })

      await payload.update({
        collection:
          'flash-ai',

        id:
          enId,

        data: {
          versiuneAlternativa:
            roId,
        },

        draft:
          true,

        overrideAccess:
          true,

        req,
      })
    }

    await payload.db
      .commitTransaction(
        transactionID,
      )

    return {
      roId,
      enId,
      eventFingerprint,
      updated:
        !alreadyReciprocal,
    }
  } catch (error) {
    await payload.db
      .rollbackTransaction(
        transactionID,
      )

    throw error
  }
}
