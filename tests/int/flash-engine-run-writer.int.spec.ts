import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashEngineRun,
} from '@/payload-types'

import {
  completeFlashEngineRun,
  failFlashEngineRun,
  startFlashEngineRun,
  type FlashEngineRunWriterPayload,
} from '@/lib/flash/audit/payloadFlashEngineRunWriter'

import type {
  FlashEngineRunCompletedAuditProjection,
} from '@/lib/flash/audit/flashEngineRunAuditProjection'

function fakeRun(
  overrides:
    Partial<FlashEngineRun> = {},
): FlashEngineRun {
  return {
    id:
      41,

    flash:
      7,

    flashIdSnapshot:
      7,

    runId:
      'run:test',

    status:
      'running',

    provider:
      'anthropic',

    model:
      'test-model',

    engineVersion:
      'test-engine',

    startedAt:
      '2026-09-09T08:00:00.000Z',

    updatedAt:
      '2026-09-09T08:00:00.000Z',

    createdAt:
      '2026-09-09T08:00:00.000Z',

    ...overrides,
  }
}

describe(
  'Flash Engine run Payload writer',
  () => {
    it(
      'creates a running audit record with explicit system override',
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

              return fakeRun()
            },

          update:
            async () =>
              fakeRun(),
        } as unknown as
          FlashEngineRunWriterPayload

        await startFlashEngineRun({
          payload,

          flashId:
            7,

          runId:
            ' run:test ',

          provider:
            ' anthropic ',

          model:
            ' test-model ',

          engineVersion:
            ' test-engine ',

          startedAt:
            '2026-09-09T08:00:00.000Z',
        })

        expect(
          calls,
        ).toEqual([
          {
            collection:
              'flash-engine-runs',

            data: {
              flash:
                7,

              flashIdSnapshot:
                7,

              runId:
                'run:test',

              status:
                'running',

              provider:
                'anthropic',

              model:
                'test-model',

              engineVersion:
                'test-engine',

              startedAt:
                '2026-09-09T08:00:00.000Z',
            },

            overrideAccess:
              true,
          },
        ])
      },
    )

    it(
      'persists only the completed audit projection',
      async () => {
        const calls:
          unknown[] = []

        const payload = {
          create:
            async () =>
              fakeRun(),

          update:
            async (
              input:
                unknown,
            ) => {
              calls.push(
                input,
              )

              return fakeRun({
                status:
                  'completed',
              })
            },
        } as unknown as
          FlashEngineRunWriterPayload

        const projection:
          FlashEngineRunCompletedAuditProjection = {
            decision:
              'review',

            reasons: [
              {
                reason:
                  'engine_uncertain',
              },
            ],

            decisionInputSnapshot: {
              informationStatus:
                'official',

              riskLevel:
                'low',

              roComplete:
                true,

              enComplete:
                true,

              dedupPassed:
                true,

              sourcesValid:
                true,

              factsSupportedBySources:
                true,

              materialContradictions:
                false,

              sourceAllowsAutoPublish:
                true,

              requiredDisclaimersApplied:
                true,

              engineCertain:
                false,

              safetyGateTriggered:
                false,

              importantMedicalInterpretation:
                false,

              extraordinaryClaimNeedsReview:
                false,

              regulatoryStatusUnclear:
                false,

              obviousDuplicate:
                false,

              unverifiableSources:
                false,

              fabricatedInformation:
                false,

              fabricatedCitations:
                false,

              individualDiagnosis:
                false,

              individualTreatmentRecommendation:
                false,

              medicationChange:
                false,

              dangerousInstructions:
                false,

              fundamentalEditorialViolation:
                false,
            },

            evidenceSummary: {
              factual: {
                evidenceSetComplete:
                  true,

                sourceCorpusComplete:
                  true,

                sourceDocumentCount:
                  1,

                chunkCount:
                  2,

                claimExtraction:
                  'completed',

                verification:
                  'completed',
              },

              semantic: {
                contradictions:
                  'notRun',

                safety:
                  'completed',

                medicalInterpretation:
                  'completed',

                extraordinaryClaim:
                  'completed',

                regulatoryStatus:
                  'completed',
              },

              runtime: {
                aggregatedEvidenceComplete:
                  false,

                engineCertain:
                  false,

                missingComponents: [
                  'contradictions',
                ],
              },
            },
          }

        await completeFlashEngineRun({
          payload,

          runRecordId:
            41,

          projection,

          completedAt:
            '2026-09-09T08:01:00.000Z',
        })

        expect(
          calls,
        ).toEqual([
          {
            collection:
              'flash-engine-runs',

            id:
              41,

            data: {
              status:
                'completed',

              completedAt:
                '2026-09-09T08:01:00.000Z',

              decision:
                'review',

              reasons: [
                {
                  reason:
                    'engine_uncertain',
                },
              ],

              decisionInputSnapshot:
                projection
                  .decisionInputSnapshot,

              evidenceSummary:
                projection
                  .evidenceSummary,

              errorCode:
                null,

              errorMessage:
                null,
            },

            overrideAccess:
              true,
          },
        ])
      },
    )

    it(
      'marks a failed run without persisting an Error object',
      async () => {
        const calls:
          unknown[] = []

        const payload = {
          create:
            async () =>
              fakeRun(),

          update:
            async (
              input:
                unknown,
            ) => {
              calls.push(
                input,
              )

              return fakeRun({
                status:
                  'failed',
              })
            },
        } as unknown as
          FlashEngineRunWriterPayload

        await failFlashEngineRun({
          payload,

          runRecordId:
            41,

          errorCode:
            ' PROVIDER_ERROR ',

          sanitizedErrorMessage:
            ' Provider request failed. ',

          completedAt:
            '2026-09-09T08:02:00.000Z',
        })

        expect(
          calls,
        ).toEqual([
          {
            collection:
              'flash-engine-runs',

            id:
              41,

            data: {
              status:
                'failed',

              completedAt:
                '2026-09-09T08:02:00.000Z',

              decision:
                null,

              reasons:
                [],

              decisionInputSnapshot:
                null,

              evidenceSummary:
                null,

              errorCode:
                'PROVIDER_ERROR',

              errorMessage:
                'Provider request failed.',
            },

            overrideAccess:
              true,
          },
        ])
      },
    )

    it(
      'rejects invalid identifiers before any Payload write',
      async () => {
        let writes =
          0

        const payload = {
          create:
            async () => {
              writes +=
                1

              return fakeRun()
            },

          update:
            async () => {
              writes +=
                1

              return fakeRun()
            },
        } as unknown as
          FlashEngineRunWriterPayload

        await expect(
          startFlashEngineRun({
            payload,
            flashId:
              0,
            runId:
              'run:test',
            provider:
              'anthropic',
            model:
              'test-model',
            engineVersion:
              'test-engine',
          }),
        ).rejects.toThrow(
          'Invalid flashId',
        )

        await expect(
          failFlashEngineRun({
            payload,
            runRecordId:
              -1,
            errorCode:
              'TEST_ERROR',
          }),
        ).rejects.toThrow(
          'Invalid runRecordId',
        )

        expect(
          writes,
        ).toBe(
          0,
        )
      },
    )
  },
)
