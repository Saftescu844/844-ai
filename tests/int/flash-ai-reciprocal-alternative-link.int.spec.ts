import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import {
  linkFlashAiReciprocalAlternatives,
  type FlashAiReciprocalAlternativeLinkPayload,
} from '@/lib/flash/ingestion/payloadFlashAiReciprocalAlternativeLinker'

function flash({
  id,
  language,
  eventFingerprint =
    'grounded-event-fingerprint',
  alternative =
    null,
  status =
    'draft',
}: {
  id: number
  language:
    'ro' | 'en'
  eventFingerprint?:
    string | null
  alternative?:
    number | null
  status?:
    'draft' | 'published'
}): FlashAi {
  return {
    id,

    titlu:
      language === 'ro'
        ? 'Titlu română'
        : 'English title',

    slug:
      language === 'ro'
        ? 'titlu-romana-test'
        : 'english-title-test',

    limba:
      language,

    versiuneAlternativa:
      alternative,

    pilon:
      1,

    flashType:
      'announcement',

    continut:
      {} as FlashAi['continut'],

    informationStatus:
      'official',

    riskLevel:
      'low',

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    eventFingerprint,

    updatedAt:
      '2026-09-20T00:00:00.000Z',

    createdAt:
      '2026-09-20T00:00:00.000Z',

    _status:
      status,
  }
}

function payloadFor({
  ro =
    flash({
      id:
        10,
      language:
        'ro',
    }),

  en =
    flash({
      id:
        20,
      language:
        'en',
    }),

  failSecondUpdate =
    false,

  transactionID =
    'tx-u14-8e',
}: {
  ro?: FlashAi
  en?: FlashAi
  failSecondUpdate?: boolean
  transactionID?: string | null
} = {}) {
  const beginTransaction =
    vi.fn().mockResolvedValue(
      transactionID,
    )

  const commitTransaction =
    vi.fn().mockResolvedValue(
      undefined,
    )

  const rollbackTransaction =
    vi.fn().mockResolvedValue(
      undefined,
    )

  const findByID =
    vi.fn().mockImplementation(
      async ({
        id,
      }: {
        id:
          number
      }) => {
        if (id === ro.id) {
          return ro
        }

        if (id === en.id) {
          return en
        }

        throw new Error(
          'Unexpected test id.',
        )
      },
    )

  const update =
    vi.fn()
      .mockResolvedValueOnce(
        ro,
      )

  if (failSecondUpdate) {
    update.mockRejectedValueOnce(
      new Error(
        'second update failed',
      ),
    )
  } else {
    update.mockResolvedValueOnce(
      en,
    )
  }

  const payload = {
    findByID,
    update,

    db: {
      beginTransaction,
      commitTransaction,
      rollbackTransaction,
    },
  } as unknown as
    FlashAiReciprocalAlternativeLinkPayload

  return {
    payload,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    findByID,
    update,
  }
}

describe(
  'Flash U14.8E reciprocal alternative linking',
  () => {
    it(
      'atomically links RO and EN drafts from the same grounded event',
      async () => {
        const fixture =
          payloadFor()

        const result =
          await linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          })

        expect(result)
          .toEqual({
            roId:
              10,

            enId:
              20,

            eventFingerprint:
              'grounded-event-fingerprint',

            updated:
              true,
          })

        expect(
          fixture.beginTransaction,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          fixture.findByID,
        ).toHaveBeenCalledTimes(
          2,
        )

        expect(
          fixture.findByID,
        ).toHaveBeenNthCalledWith(
          1,
          {
            collection:
              'flash-ai',

            id:
              10,

            depth:
              0,

            draft:
              true,

            overrideAccess:
              true,

            req: {
              transactionID:
                'tx-u14-8e',
            },
          },
        )

        expect(
          fixture.update,
        ).toHaveBeenCalledTimes(
          2,
        )

        expect(
          fixture.update,
        ).toHaveBeenNthCalledWith(
          1,
          {
            collection:
              'flash-ai',

            id:
              10,

            data: {
              versiuneAlternativa:
                20,
            },

            draft:
              true,

            overrideAccess:
              true,

            req: {
              transactionID:
                'tx-u14-8e',
            },
          },
        )

        expect(
          fixture.update,
        ).toHaveBeenNthCalledWith(
          2,
          {
            collection:
              'flash-ai',

            id:
              20,

            data: {
              versiuneAlternativa:
                10,
            },

            draft:
              true,

            overrideAccess:
              true,

            req: {
              transactionID:
                'tx-u14-8e',
            },
          },
        )

        expect(
          fixture.commitTransaction,
        ).toHaveBeenCalledWith(
          'tx-u14-8e',
        )

        expect(
          fixture.rollbackTransaction,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'is idempotent when the pair is already linked reciprocally',
      async () => {
        const fixture =
          payloadFor({
            ro:
              flash({
                id:
                  10,

                language:
                  'ro',

                alternative:
                  20,
              }),

            en:
              flash({
                id:
                  20,

                language:
                  'en',

                alternative:
                  10,
              }),
          })

        const result =
          await linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          })

        expect(
          result.updated,
        ).toBe(
          false,
        )

        expect(
          fixture.update,
        ).not.toHaveBeenCalled()

        expect(
          fixture.commitTransaction,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          fixture.rollbackTransaction,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects self-linking before a transaction starts',
      async () => {
        const fixture =
          payloadFor()

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              10,
          }),
        ).rejects.toThrow(
          'FlashAI reciprocal alternative link does not allow self-linking.',
        )

        expect(
          fixture.beginTransaction,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rolls back when the declared RO and EN order is invalid',
      async () => {
        const fixture =
          payloadFor({
            ro:
              flash({
                id:
                  10,

                language:
                  'en',
              }),

            en:
              flash({
                id:
                  20,

                language:
                  'ro',
              }),
          })

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          }),
        ).rejects.toThrow(
          'FlashAI reciprocal alternative link requires RO and EN documents in the declared order.',
        )

        expect(
          fixture.update,
        ).not.toHaveBeenCalled()

        expect(
          fixture.commitTransaction,
        ).not.toHaveBeenCalled()

        expect(
          fixture.rollbackTransaction,
        ).toHaveBeenCalledWith(
          'tx-u14-8e',
        )
      },
    )

    it(
      'rolls back when event fingerprints are missing or different',
      async () => {
        const fixture =
          payloadFor({
            en:
              flash({
                id:
                  20,

                language:
                  'en',

                eventFingerprint:
                  'different-event',
              }),
          })

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          }),
        ).rejects.toThrow(
          'FlashAI reciprocal alternative link requires the same grounded event fingerprint.',
        )

        expect(
          fixture.update,
        ).not.toHaveBeenCalled()

        expect(
          fixture.rollbackTransaction,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'rolls back when either document already points to another alternative',
      async () => {
        const fixture =
          payloadFor({
            ro:
              flash({
                id:
                  10,

                language:
                  'ro',

                alternative:
                  99,
              }),
          })

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          }),
        ).rejects.toThrow(
          'FlashAI reciprocal alternative link found a conflicting existing alternative.',
        )

        expect(
          fixture.update,
        ).not.toHaveBeenCalled()

        expect(
          fixture.rollbackTransaction,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'does not modify published Flash documents',
      async () => {
        const fixture =
          payloadFor({
            ro:
              flash({
                id:
                  10,

                language:
                  'ro',

                status:
                  'published',
              }),
          })

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          }),
        ).rejects.toThrow(
          'FlashAI reciprocal alternative link requires two draft documents.',
        )

        expect(
          fixture.update,
        ).not.toHaveBeenCalled()

        expect(
          fixture.rollbackTransaction,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'rolls back the transaction when the second reciprocal update fails',
      async () => {
        const fixture =
          payloadFor({
            failSecondUpdate:
              true,
          })

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          }),
        ).rejects.toThrow(
          'second update failed',
        )

        expect(
          fixture.update,
        ).toHaveBeenCalledTimes(
          2,
        )

        expect(
          fixture.commitTransaction,
        ).not.toHaveBeenCalled()

        expect(
          fixture.rollbackTransaction,
        ).toHaveBeenCalledWith(
          'tx-u14-8e',
        )
      },
    )

    it(
      'fails closed when the database adapter cannot provide a transaction',
      async () => {
        const fixture =
          payloadFor({
            transactionID:
              null,
          })

        await expect(
          linkFlashAiReciprocalAlternatives({
            payload:
              fixture.payload,

            roId:
              10,

            enId:
              20,
          }),
        ).rejects.toThrow(
          'FlashAI reciprocal alternative link requires transaction support.',
        )

        expect(
          fixture.findByID,
        ).not.toHaveBeenCalled()

        expect(
          fixture.update,
        ).not.toHaveBeenCalled()

        expect(
          fixture.commitTransaction,
        ).not.toHaveBeenCalled()

        expect(
          fixture.rollbackTransaction,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
