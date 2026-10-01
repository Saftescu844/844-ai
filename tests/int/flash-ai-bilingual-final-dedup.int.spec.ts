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

type FlashLanguage =
  'ro' | 'en'

function candidate():
  FlashNormalizedArticleCandidate {
  return {
    sourceId:
      4,

    sourceName:
      'Verified English Source',

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
      'https://example.com/verified-event',

    canonicalUrl:
      'https://example.com/verified-event',

    title:
      'Verified source event title',

    contentType:
      'NEWS ARTICLE',

    sourcePublicationDateRaw:
      '20 September 2026',

    sourcePublicationDate:
      '2026-09-20',

    lead:
      'Verified source lead.',

    bodyParagraphs: [
      'Verified source body.',
    ],

    bodyText:
      'Verified source body.',
  }
}

function projection(
  language:
    FlashLanguage,
):
  FlashAiDraftProjection {
  return {
    titlu:
      language === 'ro'
        ? 'Același eveniment verificat'
        : 'The same verified event',

    limba:
      language,

    pilon:
      1,

    flashType:
      'announcement',

    continut:
      {} as never,

    surseFlash: [
      {
        sursa:
          4,

        url:
          'https://example.com/verified-event',

        sourcePublishedAt:
          '2026-09-20',

        primary:
          true,
      },
    ],

    informationStatus:
      'official',

    riskLevel:
      'low',

    isHealthRelated:
      false,

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    sourceFingerprint:
      'same-source-fingerprint',

    eventFingerprint:
      'same-grounded-event',

    generatAutomat:
      true,

    _status:
      'draft',
  }
}

function existingFlash(
  language:
    FlashLanguage,
  id:
    number,
): FlashAi {
  return {
    id,

    titlu:
      language === 'ro'
        ? 'Același eveniment verificat'
        : 'The same verified event',

    slug:
      language === 'ro'
        ? 'acelasi-eveniment-verificat'
        : 'the-same-verified-event',

    limba:
      language,

    versiuneAlternativa:
      null,

    pilon:
      1,

    flashType:
      'announcement',

    continut:
      {} as FlashAi['continut'],

    surseFlash: [
      {
        sursa:
          4,

        url:
          'https://example.com/verified-event',

        sourcePublishedAt:
          '2026-09-20',

        primary:
          true,
      },
    ],

    informationStatus:
      'official',

    riskLevel:
      'low',

    isHealthRelated:
      false,

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    eventFingerprint:
      'same-grounded-event',

    sourceFingerprint:
      'same-source-fingerprint',

    generatAutomat:
      true,

    updatedAt:
      '2026-09-20T00:00:00.000Z',

    createdAt:
      '2026-09-20T00:00:00.000Z',

    _status:
      'draft',
  }
}

function payloadReturning(
  docs:
    FlashAi[],
) {
  const find =
    vi.fn().mockResolvedValue({
      docs,
      totalDocs:
        docs.length,
    })

  const create =
    vi.fn().mockImplementation(
      async ({
        data,
      }: {
        data:
          FlashAiDraftProjection
      }) => ({
        id:
          100,

        ...data,

        createdAt:
          '2026-09-20T00:00:00.000Z',

        updatedAt:
          '2026-09-20T00:00:00.000Z',
      } as FlashAi),
    )

  const payload = {
    find,
    create,
  } as unknown as
    FlashAiFinalDedupWriterPayload

  return {
    payload,
    find,
    create,
  }
}

function expectAllFindsScopedToLanguage(
  find:
    ReturnType<typeof vi.fn>,
  language:
    FlashLanguage,
): void {
  expect(
    find,
  ).toHaveBeenCalledTimes(
    4,
  )

  for (
    const [
      call,
    ]
    of find.mock.calls
  ) {
    const serialized =
      JSON.stringify(
        call,
      )

    expect(
      serialized,
    ).toContain(
      `"limba":{"equals":"${language}"}`,
    )
  }
}

describe(
  'Flash U14.8F bilingual final dedup validation',
  () => {
    it(
      'blocks the same grounded event when RO already exists and target is RO',
      async () => {
        const fixture =
          payloadReturning([
            existingFlash(
              'ro',
              10,
            ),
          ])

        await expect(
          createFlashAiDraftWithFinalDedupGuard({
            payload:
              fixture.payload,

            candidate:
              candidate(),

            projection:
              projection(
                'ro',
              ),
          }),
        ).rejects.toThrow(
          'FlashAI final pre-write dedup guard blocked persistence.',
        )

        expect(
          fixture.create,
        ).not.toHaveBeenCalled()

        expectAllFindsScopedToLanguage(
          fixture.find,
          'ro',
        )
      },
    )

    it(
      'blocks the same grounded event when EN already exists and target is EN',
      async () => {
        const fixture =
          payloadReturning([
            existingFlash(
              'en',
              20,
            ),
          ])

        await expect(
          createFlashAiDraftWithFinalDedupGuard({
            payload:
              fixture.payload,

            candidate:
              candidate(),

            projection:
              projection(
                'en',
              ),
          }),
        ).rejects.toThrow(
          'FlashAI final pre-write dedup guard blocked persistence.',
        )

        expect(
          fixture.create,
        ).not.toHaveBeenCalled()

        expectAllFindsScopedToLanguage(
          fixture.find,
          'en',
        )
      },
    )

    it(
      'allows EN sibling for the same grounded event when only RO exists',
      async () => {
        const fixture =
          payloadReturning([
            existingFlash(
              'ro',
              10,
            ),
          ])

        const result =
          await createFlashAiDraftWithFinalDedupGuard({
            payload:
              fixture.payload,

            candidate:
              candidate(),

            projection:
              projection(
                'en',
              ),
          })

        expect(
          result.limba,
        ).toBe(
          'en',
        )

        expect(
          fixture.create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expectAllFindsScopedToLanguage(
          fixture.find,
          'en',
        )
      },
    )

    it(
      'allows RO sibling for the same grounded event when only EN exists',
      async () => {
        const fixture =
          payloadReturning([
            existingFlash(
              'en',
              20,
            ),
          ])

        const result =
          await createFlashAiDraftWithFinalDedupGuard({
            payload:
              fixture.payload,

            candidate:
              candidate(),

            projection:
              projection(
                'ro',
              ),
          })

        expect(
          result.limba,
        ).toBe(
          'ro',
        )

        expect(
          fixture.create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expectAllFindsScopedToLanguage(
          fixture.find,
          'ro',
        )
      },
    )
  },
)
