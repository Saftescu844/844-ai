import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

import type {
  FlashAiStagingWriteInput,
} from './flashAiStagingWriteInput'

import {
  evaluateFlashArticlePrePersistenceDedupReadOnly,
} from './payloadArticleCandidatePrePersistenceDedupReadOnly'

type AtomicPairPayload =
  Pick<
    Payload,
    'find' | 'create' | 'update' | 'db'
  >

export interface CreateFlashAiAtomicReviewPairInput {
  payload:
    AtomicPairPayload

  ro:
    FlashAiStagingWriteInput

  en:
    FlashAiStagingWriteInput
}

export interface CreateFlashAiAtomicReviewPairResult {
  roId: number
  enId: number
  eventFingerprint: string
  sourceFingerprint:
    string | null
}

function normalizedFingerprint(
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

function assertSafeDraftProjection(
  input:
    FlashAiStagingWriteInput,
  expectedLanguage:
    'ro' | 'en',
): void {
  const projection =
    input.projection

  if (
    projection.limba !==
      expectedLanguage ||
    projection.editorialStatus !==
      'draft' ||
    projection.automationDecision !==
      'review' ||
    projection._status !==
      'draft' ||
    projection.generatAutomat !==
      true
  ) {
    throw new Error(
      `FlashAI atomic pair requires a safe ${expectedLanguage.toUpperCase()} draft projection.`,
    )
  }

  const primarySource =
    projection.surseFlash.find(
      source =>
        source.primary === true,
    )

  if (
    !primarySource ||
    primarySource.url !==
      input.candidate
        .canonicalUrl
  ) {
    throw new Error(
      'FlashAI atomic pair requires the projection primary source to match the candidate canonical URL.',
    )
  }

  if (
    input.candidate
      .allowAutoPublish !==
    false
  ) {
    throw new Error(
      'FlashAI atomic pair staging requires allowAutoPublish=false.',
    )
  }
}

function assertSameGroundedEvent(
  ro:
    FlashAiStagingWriteInput,
  en:
    FlashAiStagingWriteInput,
): string {
  const roEventFingerprint =
    normalizedFingerprint(
      ro.projection
        .eventFingerprint,
    )

  const enEventFingerprint =
    normalizedFingerprint(
      en.projection
        .eventFingerprint,
    )

  if (
    !roEventFingerprint ||
    !enEventFingerprint ||
    roEventFingerprint !==
      enEventFingerprint
  ) {
    throw new Error(
      'FlashAI atomic pair requires one identical grounded event fingerprint for RO and EN.',
    )
  }

  return roEventFingerprint
}

function assertSameSource(
  ro:
    FlashAiStagingWriteInput,
  en:
    FlashAiStagingWriteInput,
): string | null {
  if (
    ro.candidate.sourceId !==
      en.candidate.sourceId ||
    ro.candidate
      .canonicalUrl !==
      en.candidate
        .canonicalUrl
  ) {
    throw new Error(
      'FlashAI atomic pair requires RO and EN to originate from the same source candidate.',
    )
  }

  const roSourceFingerprint =
    normalizedFingerprint(
      ro.projection
        .sourceFingerprint,
    )

  const enSourceFingerprint =
    normalizedFingerprint(
      en.projection
        .sourceFingerprint,
    )

  if (
    roSourceFingerprint !==
      enSourceFingerprint
  ) {
    throw new Error(
      'FlashAI atomic pair requires matching source fingerprints.',
    )
  }

  return roSourceFingerprint
}

async function assertFinalDedupPasses({
  payload,
  input,
  targetLanguage,
}: {
  payload:
    Pick<Payload, 'find'>

  input:
    FlashAiStagingWriteInput

  targetLanguage:
    'ro' | 'en'
}): Promise<void> {
  const finalDedup =
    await evaluateFlashArticlePrePersistenceDedupReadOnly(
      payload,
      input.candidate,
      {
        eventFingerprint:
          input.projection
            .eventFingerprint,

        sourceFingerprint:
          input.projection
            .sourceFingerprint,

        targetLanguage,
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
      `FlashAI atomic pair final dedup blocked ${targetLanguage.toUpperCase()} persistence.`,
    )
  }
}

/**
 * Persists one verified RO+EN pair as an atomic review-only unit.
 *
 * Both handoffs must already have passed extraction, classification,
 * editorial generation, QA, Lexical round-trip and persistence readiness.
 *
 * Safety contract:
 * - same source candidate;
 * - same grounded event fingerprint;
 * - RO + EN only;
 * - both projections remain draft/review-only;
 * - allowAutoPublish=false on the source candidate;
 * - final dedup passes independently in both languages;
 * - RO create + EN create + reciprocal linking + review transition
 *   share one database transaction;
 * - no publication or publishedAt mutation occurs here.
 */
export async function createFlashAiAtomicReviewPair({
  payload,
  ro,
  en,
}: CreateFlashAiAtomicReviewPairInput): Promise<
  CreateFlashAiAtomicReviewPairResult
> {
  assertSafeDraftProjection(
    ro,
    'ro',
  )

  assertSafeDraftProjection(
    en,
    'en',
  )

  const eventFingerprint =
    assertSameGroundedEvent(
      ro,
      en,
    )

  const sourceFingerprint =
    assertSameSource(
      ro,
      en,
    )

  /*
   * Re-run the exact final dedup immediately before opening
   * the pair transaction. The dedicated one-shot service is
   * the only producer in this controlled STAGING path.
   */
  await Promise.all([
    assertFinalDedupPasses({
      payload,
      input:
        ro,
      targetLanguage:
        'ro',
    }),

    assertFinalDedupPasses({
      payload,
      input:
        en,
      targetLanguage:
        'en',
    }),
  ])

  const transactionID =
    await payload.db
      .beginTransaction()

  if (
    transactionID === null ||
    transactionID ===
      undefined
  ) {
    throw new Error(
      'FlashAI atomic pair requires transaction support.',
    )
  }

  try {
    const req = {
      transactionID,
    }

    const roCreated =
      await payload.create({
        collection:
          'flash-ai',
        data:
          ro.projection,
        draft:
          true,
        overrideAccess:
          true,
        req,
      })

    const enCreated =
      await payload.create({
        collection:
          'flash-ai',
        data:
          en.projection,
        draft:
          true,
        overrideAccess:
          true,
        req,
      })

    const [
      roUpdated,
      enUpdated,
    ] =
      await Promise.all([
        payload.update({
          collection:
            'flash-ai',
          id:
            roCreated.id,
          data: {
            versiuneAlternativa:
              enCreated.id,
            editorialStatus:
              'review',
            automationDecision:
              'review',
            _status:
              'draft',
          },
          draft:
            true,
          overrideAccess:
            true,
          req,
        }),

        payload.update({
          collection:
            'flash-ai',
          id:
            enCreated.id,
          data: {
            versiuneAlternativa:
              roCreated.id,
            editorialStatus:
              'review',
            automationDecision:
              'review',
            _status:
              'draft',
          },
          draft:
            true,
          overrideAccess:
            true,
          req,
        }),
      ])

    const assertReviewDraft =
      (
        document:
          FlashAi,
      ) => {
        if (
          document._status !==
            'draft' ||
          document
            .editorialStatus !==
            'review' ||
          document
            .automationDecision !==
            'review' ||
          document
            .publishedAt
        ) {
          throw new Error(
            'FlashAI atomic pair produced an unsafe post-write state.',
          )
        }
      }

    assertReviewDraft(
      roUpdated,
    )

    assertReviewDraft(
      enUpdated,
    )

    await payload.db
      .commitTransaction(
        transactionID,
      )

    return {
      roId:
        roUpdated.id,
      enId:
        enUpdated.id,
      eventFingerprint,
      sourceFingerprint,
    }
  } catch (error) {
    await payload.db
      .rollbackTransaction(
        transactionID,
      )

    throw error
  }
}
