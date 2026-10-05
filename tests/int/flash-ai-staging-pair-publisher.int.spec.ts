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
  publishFlashAiStagingPair,
} from '@/lib/flash/ingestion/payloadFlashAiStagingPairPublisher'

function flash(
  overrides:
    Partial<FlashAi>,
): FlashAi {
  return {
    id:
      1,
    titlu:
      'Title',
    slug:
      'slug',
    limba:
      'ro',
    versiuneAlternativa:
      2,
    pilon:
      3,
    flashType:
      'research',
    excerpt:
      'Excerpt',
    continut: {
      root: {
        type:
          'root',
        children: [],
        direction:
          null,
        format:
          '',
        indent:
          0,
        version:
          1,
      },
    },
    surseFlash: [],
    informationStatus:
      'official',
    riskLevel:
      'medium',
    isHealthRelated:
      false,
    disclaimerTypes: [],
    editorialStatus:
      'review',
    automationDecision:
      'review',
    eventFingerprint:
      'same-event',
    sourceFingerprint:
      'source',
    generatAutomat:
      true,
    publishedAt:
      null,
    createdAt:
      '2026-10-05T00:00:00.000Z',
    updatedAt:
      '2026-10-05T00:00:00.000Z',
    _status:
      'draft',
    ...overrides,
  } as FlashAi
}

describe(
  'publishFlashAiStagingPair',
  () => {
    it(
      'publishes the latest RO and EN drafts atomically and carries draft edits into the published write',
      async () => {
        const ro =
          flash({
            id:
              8,
            limba:
              'ro',
            versiuneAlternativa:
              10,
            excerpt:
              'Excerpt RO verificat',
            titlu:
              'Titlu RO corectat',
          })

        const en =
          flash({
            id:
              10,
            limba:
              'en',
            versiuneAlternativa:
              8,
            excerpt:
              'Verified EN excerpt',
            titlu:
              'Verified EN title',
          })

        const beginTransaction =
          vi.fn(
            async () =>
              'tx-publish',
          )

        const commitTransaction =
          vi.fn(
            async () =>
              undefined,
          )

        const rollbackTransaction =
          vi.fn(
            async () =>
              undefined,
          )

        const findByID =
          vi.fn(
            async ({
              id,
            }: {
              id:
                number
            }) =>
              id === 8
                ? ro
                : en,
          )

        const update =
          vi.fn(
            async ({
              id,
              data,
            }: {
              id:
                number
              data:
                Record<
                  string,
                  unknown
                >
            }) => ({
              ...(id === 8
                ? ro
                : en),
              ...data,
              editorialStatus:
                'approved',
              publishedAt:
                '2026-10-05T06:30:00.000Z',
              _status:
                'published',
            }) as FlashAi,
          )

        const result =
          await publishFlashAiStagingPair({
            payload: {
              findByID:
                findByID as never,
              update:
                update as never,
              db: {
                beginTransaction,
                commitTransaction,
                rollbackTransaction,
              } as never,
            },
            roId:
              8,
            enId:
              10,
          })

        expect(
          result.eventFingerprint,
        ).toBe(
          'same-event',
        )

        expect(
          update,
        ).toHaveBeenCalledTimes(
          2,
        )

        expect(
          update.mock.calls[0]?.[0],
        ).toMatchObject({
          id:
            8,
          draft:
            false,
          data: {
            titlu:
              'Titlu RO corectat',
            excerpt:
              'Excerpt RO verificat',
            _status:
              'published',
          },
          req: {
            transactionID:
              'tx-publish',
          },
        })

        expect(
          update.mock.calls[1]?.[0],
        ).toMatchObject({
          id:
            10,
          draft:
            false,
          data: {
            titlu:
              'Verified EN title',
            excerpt:
              'Verified EN excerpt',
            _status:
              'published',
          },
          req: {
            transactionID:
              'tx-publish',
          },
        })

        expect(
          commitTransaction,
        ).toHaveBeenCalledWith(
          'tx-publish',
        )

        expect(
          rollbackTransaction,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
