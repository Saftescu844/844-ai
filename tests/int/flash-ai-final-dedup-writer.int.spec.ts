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

function candidate(
  overrides:
    Partial<FlashNormalizedArticleCandidate> = {},
): FlashNormalizedArticleCandidate {
  return {
    sourceId:
      4,

    sourceName:
      'Comisia Europeană — Digital Strategy / AI',

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
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',

    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',

    title:
      'Fourth GPAI Signatory Taskforce meeting',

    contentType:
      'NEWS ARTICLE',

    sourcePublicationDateRaw:
      '03 August 2026',

    sourcePublicationDate:
      '2026-08-03',

    lead:
      'Official lead.',

    bodyParagraphs: [
      'Official body.',
    ],

    bodyText:
      'Official body.',

    ...overrides,
  }
}

function projection(
  overrides:
    Partial<FlashAiDraftProjection> = {},
): FlashAiDraftProjection {
  return {
    titlu:
      'A patra reuniune a grupului de semnatari GPAI',

    limba:
      'ro',

    pilon:
      1,

    flashType:
      'update',

    continut:
      {} as never,

    surseFlash: [
      {
        sursa:
          4,

        url:
          'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',

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
      '084f1199b4915a604c578316b8a4ef6fd15097952ef38a97be960e1771a663a0',

    eventFingerprint:
      null,

    generatAutomat:
      true,

    _status:
      'draft',

    ...overrides,
  }
}

function emptyPayload() {
  const create =
    vi.fn(
      async () =>
        ({
          id:
            71,
        }) as FlashAi,
    )

  const find =
    vi.fn(
      async () => ({
        docs:
          [],
      }),
    )

  return {
    payload:
      ({
        find,
        create,
      }) as unknown as
        FlashAiFinalDedupWriterPayload,

    find,
    create,
  }
}

describe(
  'FlashAI final dedup writer with pending event identity',
  () => {
    it(
      'persists a high-trust primary source only as a safe review draft when event identity remains pending and dedup is otherwise clean',
      async () => {
        const {
          payload,
          create,
        } =
          emptyPayload()

        const result =
          await createFlashAiDraftWithFinalDedupGuard({
            payload,
            candidate:
              candidate(),
            projection:
              projection(),
          })

        expect(
          result.id,
        ).toBe(
          71,
        )

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            collection:
              'flash-ai',

            draft:
              true,

            overrideAccess:
              true,

            data:
              expect.objectContaining({
                editorialStatus:
                  'draft',

                automationDecision:
                  'review',

                eventFingerprint:
                  null,

                _status:
                  'draft',
              }),
          }),
        )
      },
    )

    it(
      'fails closed for pending event identity when the source permits auto-publish',
      async () => {
        const {
          payload,
          create,
        } =
          emptyPayload()

        await expect(
          createFlashAiDraftWithFinalDedupGuard({
            payload,
            candidate:
              candidate({
                allowAutoPublish:
                  true,
              }),
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
      'still blocks an exact canonical source duplicate',
      async () => {
        const create =
          vi.fn(
            async () =>
              ({
                id:
                  72,
              }) as FlashAi,
          )

        let findCall =
          0

        const find =
          vi.fn(
            async () => {
              findCall +=
                1

              if (
                findCall ===
                1
              ) {
                return {
                  docs: [
                    {
                      id:
                        9,

                      limba:
                        'ro',

                      titlu:
                        'Articol existent',

                      eventFingerprint:
                        null,

                      sourceFingerprint:
                        null,

                      surseFlash: [
                        {
                          url:
                            'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',

                          primary:
                            true,
                        },
                      ],
                    },
                  ],
                }
              }

              return {
                docs:
                  [],
              }
            },
          )

        const payload =
          ({
            find,
            create,
          }) as unknown as
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
      'preserves the existing grounded-event write path',
      async () => {
        const {
          payload,
          create,
        } =
          emptyPayload()

        await createFlashAiDraftWithFinalDedupGuard({
          payload,
          candidate:
            candidate(),
          projection:
            projection({
              eventFingerprint:
                'grounded-event-fingerprint',
            }),
        })

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )
  },
)
