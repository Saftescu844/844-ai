import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import {
  projectFlashAiDraftFromPersistenceReadiness,
  type FlashAiDraftProjection,
} from '@/lib/flash/ingestion/articleCandidateFlashAiDraftProjection'

import type {
  FlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'

import {
  createFlashAiDraft,
  type FlashAiDraftWriterPayload,
} from '@/lib/flash/ingestion/payloadFlashAiDraftWriter'

describe(
  'FlashAI draft Payload writer',
  () => {
    it(
      'creates only a Payload draft from a safe projection',
      async () => {
        const calls:
          unknown[] = []

        const payload = {
          create:
            async (
              input:
                unknown,
            ) => {
              calls.push(
                input,
              )

              return {
                id: 51,
              } as FlashAi
            },
        } as unknown as
          FlashAiDraftWriterPayload

        const projection:
          FlashAiDraftProjection = {
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
              null,

            generatAutomat:
              true,

            _status:
              'draft',
          }

        await createFlashAiDraft({
          payload,
          projection,
        })

        expect(
          calls,
        ).toEqual([
          {
            collection:
              'flash-ai',

            data:
              projection,

            draft:
              true,

            overrideAccess:
              true,
          },
        ])
      },
    )
  },
)

it(
  'fails closed before Payload when the projection is unsafe',
  async () => {
    let createCalls = 0

    const payload = {
      create:
        async () => {
          createCalls += 1

          return {
            id: 52,
          } as FlashAi
        },
    } as unknown as
      FlashAiDraftWriterPayload

    const unsafeProjection = {
      editorialStatus:
        'review',

      automationDecision:
        'review',

      _status:
        'draft',

      generatAutomat:
        true,
    } as unknown as
      FlashAiDraftProjection

    await expect(
      createFlashAiDraft({
        payload,
        projection:
          unsafeProjection,
      }),
    ).rejects.toThrow(
      'FlashAI draft writer requires a safe draft projection.',
    )

    expect(
      createCalls,
    ).toBe(0)
  },
)

it.each([
  [
    'automationDecision',
    {
      editorialStatus: 'draft',
      automationDecision: 'autoPublish',
      _status: 'draft',
      generatAutomat: true,
    },
  ],
  [
    '_status',
    {
      editorialStatus: 'draft',
      automationDecision: 'review',
      _status: 'published',
      generatAutomat: true,
    },
  ],
  [
    'generatAutomat',
    {
      editorialStatus: 'draft',
      automationDecision: 'review',
      _status: 'draft',
      generatAutomat: false,
    },
  ],
])(
  'fails closed before Payload for unsafe %s',
  async (
    _field,
    unsafeValues,
  ) => {
    let createCalls = 0

    const payload = {
      create:
        async () => {
          createCalls += 1

          return {
            id: 53,
          } as FlashAi
        },
    } as unknown as
      FlashAiDraftWriterPayload

    await expect(
      createFlashAiDraft({
        payload,
        projection:
          unsafeValues as unknown as
            FlashAiDraftProjection,
      }),
    ).rejects.toThrow(
      'FlashAI draft writer requires a safe draft projection.',
    )

    expect(
      createCalls,
    ).toBe(0)
  },
)

it(
  'projects eligible readiness and persists exactly one safe draft',
  async () => {
    const calls:
      unknown[] = []

    const payload = {
      create:
        async (
          input:
            unknown,
        ) => {
          calls.push(
            input,
          )

          return {
            id: 54,
          } as FlashAi
        },
    } as unknown as
      FlashAiDraftWriterPayload

    const readiness:
      FlashArticlePersistenceReadiness = {
        canCreateFlashAiDraft:
          true,

        verifiedEditorial: {
          editorialTitle:
            'Titlu editorial verificat',

          lexicalContent:
            {} as never,
        },

        sourceGroundedValues: {
          sourceId:
            4,

          sourceName:
            'Example Source',

          language:
            'en',

          sourceTitle:
            'Original source title',

          canonicalUrl:
            'https://example.com/source',

          sourcePublishedAt:
            '2026-08-03',

          sourceFingerprint:
            'source-fingerprint',

          eventFingerprint:
            null,
        },

        classification: {
          pilonId:
            1,

          flashType:
            'regulation',

          informationStatus:
            'official',

          riskLevel:
            'medium',

          isHealthRelated:
            false,
        },

        draftControls: {
          editorialStatus:
            'draft',

          automationDecision:
            'review',

          payloadStatus:
            'draft',
        },

        deferredDecisions:
          [],

        blockers:
          [],

        reviewSignals:
          [],

        evidence: {
          sourceVerificationPassed:
            true,

          sourceDuplicateFound:
            false,

          eventFingerprintDuplicateFound:
            false,

          sourceFingerprintReviewSignal:
            false,

          titleReviewSignal:
            false,

          finalDedupPending:
            false,

          classificationAvailable:
            true,
        },
      }

    const projection =
      projectFlashAiDraftFromPersistenceReadiness(
        readiness,
      )

    await createFlashAiDraft({
      payload,
      projection,
    })

    expect(
      calls,
    ).toEqual([
      {
        collection:
          'flash-ai',

        data:
          projection,

        draft:
          true,

        overrideAccess:
          true,
      },
    ])

    expect(
      projection._status,
    ).toBe(
      'draft',
    )

    expect(
      projection.automationDecision,
    ).toBe(
      'review',
    )

    expect(
      'slug' in projection,
    ).toBe(
      false,
    )
  },
)
