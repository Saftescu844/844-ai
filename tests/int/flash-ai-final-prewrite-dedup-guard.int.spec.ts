import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashAiDraftProjection,
} from '@/lib/flash/ingestion/articleCandidateFlashAiDraftProjection'

import {
  createFlashAiDraftWithFinalDedupGuard,
  type FlashAiFinalDedupWriterPayload,
} from '@/lib/flash/ingestion/payloadFlashAiFinalDedupWriter'

function candidate():
  FlashNormalizedArticleCandidate {
  return {
    sourceId:
      4,

    sourceName:
      'Example Source',

    sourceRole:
      'primary',

    editorialTrust:
      'high',

    citationMode:
      'paraphrase',

    allowAutoPublish:
      false,

    language:
      'en',

    finalUrl:
      'https://example.com/source',

    canonicalUrl:
      'https://example.com/source',

    title:
      'Original source title',

    contentType:
      'NEWS ARTICLE',

    sourcePublicationDateRaw:
      '03 August 2026',

    sourcePublicationDate:
      '2026-08-03',

    lead:
      'Lead text',

    bodyParagraphs: [
      'Body paragraph',
    ],

    bodyText:
      'Body paragraph',
  }
}

function projection():
  FlashAiDraftProjection {
  return {
    titlu:
      'Titlu editorial verificat',

    limba:
      'ro',

    pilon:
      1,

    flashType:
      'regulation',

    continut:
      {} as never,

    surseFlash: [
      {
        sursa:
          4,

        url:
          'https://example.com/source',

        sourcePublishedAt:
          '2026-08-03',

        primary:
          true,
      },
    ],

    informationStatus:
      'official',

    riskLevel:
      'medium',

    isHealthRelated:
      false,

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    sourceFingerprint:
      'source-fingerprint',

    eventFingerprint:
      'event-fingerprint',

    generatAutomat:
      true,

    _status:
      'draft',
  }
}

describe(
  'FlashAI final pre-write dedup guard',
  () => {
    it(
      'rechecks dedup read-only before creating exactly one safe draft',
      async () => {
        const find =
          vi.fn().mockResolvedValue({
            docs:
              [],

            totalDocs:
              0,
          })

        const create =
          vi.fn().mockResolvedValue({
            id:
              55,
          } as FlashAi)

        const payload = {
          find,
          create,
        } as unknown as
          FlashAiFinalDedupWriterPayload

        const draft =
          projection()

        await createFlashAiDraftWithFinalDedupGuard({
          payload,
          candidate:
            candidate(),
          projection:
            draft,
        })

        expect(
          find,
        ).toHaveBeenCalledTimes(
          4,
        )

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          create,
        ).toHaveBeenCalledWith({
          collection:
            'flash-ai',

          data:
            draft,

          draft:
            true,

          overrideAccess:
            true,
        })
      },
    )
  },
)

it(
  'blocks persistence when the canonical source URL already exists',
  async () => {
    const duplicate = {
      id: 70,
      titlu: 'Existing Flash',
      limba: 'ro',
      surseFlash: [
        {
          url:
            'https://example.com/source',
        },
      ],
    } as FlashAi

    const find =
      vi.fn()
        .mockResolvedValueOnce({
          docs: [duplicate],
          totalDocs: 1,
        })
        .mockResolvedValue({
          docs: [],
          totalDocs: 0,
        })

    const create =
      vi.fn()

    const payload = {
      find,
      create,
    } as unknown as
      FlashAiFinalDedupWriterPayload

    await expect(
      createFlashAiDraftWithFinalDedupGuard({
        payload,
        candidate:
          candidate(),
        projection:
          projection(),
      }),
    ).rejects.toThrow(
      'FlashAI final pre-write dedup guard blocked persistence.',
    )

    expect(
      create,
    ).not.toHaveBeenCalled()
  },
)

it(
  'blocks persistence when the grounded event fingerprint already exists',
  async () => {
    const duplicate = {
      id: 71,
      titlu: 'Existing event',
      limba: 'ro',
      surseFlash: [],
      eventFingerprint:
        'event-fingerprint',
    } as FlashAi

    const find =
      vi.fn()
        .mockResolvedValueOnce({
          docs: [],
          totalDocs: 0,
        })
        .mockResolvedValueOnce({
          docs: [duplicate],
          totalDocs: 1,
        })
        .mockResolvedValue({
          docs: [],
          totalDocs: 0,
        })

    const create =
      vi.fn()

    const payload = {
      find,
      create,
    } as unknown as
      FlashAiFinalDedupWriterPayload

    await expect(
      createFlashAiDraftWithFinalDedupGuard({
        payload,
        candidate:
          candidate(),
        projection:
          projection(),
      }),
    ).rejects.toThrow(
      'FlashAI final pre-write dedup guard blocked persistence.',
    )

    expect(
      create,
    ).not.toHaveBeenCalled()
  },
)

it(
  'blocks persistence when grounded event identity is still pending',
  async () => {
    const find =
      vi.fn().mockResolvedValue({
        docs: [],
        totalDocs: 0,
      })

    const create =
      vi.fn()

    const payload = {
      find,
      create,
    } as unknown as
      FlashAiFinalDedupWriterPayload

    const incompleteProjection = {
      ...projection(),
      eventFingerprint:
        null,
    }

    await expect(
      createFlashAiDraftWithFinalDedupGuard({
        payload,
        candidate:
          candidate(),
        projection:
          incompleteProjection,
      }),
    ).rejects.toThrow(
      'FlashAI final pre-write dedup guard blocked persistence.',
    )

    expect(
      create,
    ).not.toHaveBeenCalled()
  },
)

it(
  'fails closed before Payload when candidate and projection source URLs differ',
  async () => {
    const find =
      vi.fn()

    const create =
      vi.fn()

    const payload = {
      find,
      create,
    } as unknown as
      FlashAiFinalDedupWriterPayload

    const mismatchedProjection = {
      ...projection(),

      surseFlash: [
        {
          sursa:
            4,

          url:
            'https://example.com/different-source',

          sourcePublishedAt:
            '2026-08-03',

          primary:
            true,
        },
      ],
    }

    await expect(
      createFlashAiDraftWithFinalDedupGuard({
        payload,
        candidate:
          candidate(),
        projection:
          mismatchedProjection,
      }),
    ).rejects.toThrow(
      'FlashAI final pre-write dedup guard requires matching candidate and projection source.',
    )

    expect(
      find,
    ).not.toHaveBeenCalled()

    expect(
      create,
    ).not.toHaveBeenCalled()
  },
)
