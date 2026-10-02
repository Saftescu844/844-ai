import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashEngineRun,
} from '@/payload-types'

import type {
  FlashEngineRunAuditProjectionInput,
} from '@/lib/flash/audit/flashEngineRunAuditProjection'

import type {
  FlashEngineRunWriterPayload,
} from '@/lib/flash/audit/payloadFlashEngineRunWriter'

import {
  runFlashEngineEvaluationWithAuditPersistence,
} from '@/lib/flash/audit/runFlashEngineEvaluationWithAuditPersistence'

function fakeRun(
  overrides:
    Partial<FlashEngineRun> = {},
): FlashEngineRun {
  return {
    id:
      51,

    flash:
      7,

    flashIdSnapshot:
      7,

    runId:
      'runtime:test',

    status:
      'running',

    provider:
      'anthropic',

    model:
      'test-model',

    engineVersion:
      'test-engine',

    startedAt:
      '2026-09-09T09:00:00.000Z',

    updatedAt:
      '2026-09-09T09:00:00.000Z',

    createdAt:
      '2026-09-09T09:00:00.000Z',

    ...overrides,
  }
}

function evaluationFixture():
  FlashEngineRunAuditProjectionInput {
  return {
    factualEvidenceSetComplete:
      true,

    factualSourceCorpus: {
      complete:
        true,

      documents: [
        {},
      ],
    },

    factualChunks: [
      {},
      {},
    ],

    factualClaimExtractionProduction: {
      ok:
        true,
    },

    factualVerificationProduction: {
      ok:
        true,
    },

    semanticRuntime: {
      contradictionProduction: {
        ok:
          true,
      },

      safetyProduction: {
        ok:
          true,
      },

      medicalInterpretationProduction: {
        ok:
          true,
      },

      extraordinaryClaimProduction: {
        ok:
          true,
      },

      regulatoryStatusProduction: {
        ok:
          true,
      },

      runtime: {
        runtimeDecision: {
          aggregatedEvidence: {
            complete:
              true,

            missingComponents:
              [],
          },

          decisionInput: {
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
              true,

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

          decision: {
            decision:
              'autoPublish',

            reasons: [
              'auto_publish_gates_passed',
            ],
          },
        },
      },
    },
  }
}

describe(
  'Flash Engine evaluate -> persist coordinator',
  () => {
    it(
      'persists running then completed around a successful evaluation',
      async () => {
        const createCalls:
          unknown[] = []

        const updateCalls:
          unknown[] = []

        const payload = {
          create:
            async (
              input:
                unknown,
            ) => {
              createCalls.push(
                input,
              )

              return fakeRun()
            },

          update:
            async (
              input:
                unknown,
            ) => {
              updateCalls.push(
                input,
              )

              return fakeRun({
                status:
                  'completed',

                decision:
                  'autoPublish',
              })
            },
        } as unknown as
          FlashEngineRunWriterPayload

        let evaluations =
          0

        const evaluation =
          evaluationFixture()

        const result =
          await runFlashEngineEvaluationWithAuditPersistence({
            payload,

            audit: {
              flashId:
                7,

              runId:
                'runtime:test',

              provider:
                'anthropic',

              model:
                'test-model',

              engineVersion:
                'test-engine',

              startedAt:
                '2026-09-09T09:00:00.000Z',

              completedAt:
                '2026-09-09T09:01:00.000Z',
            },

            evaluate:
              async () => {
                evaluations +=
                  1

                return evaluation
              },
          })

        expect(
          evaluations,
        ).toBe(
          1,
        )

        expect(
          result.evaluation,
        ).toBe(
          evaluation,
        )

        expect(
          result.auditRun.status,
        ).toBe(
          'completed',
        )

        expect(
          createCalls,
        ).toHaveLength(
          1,
        )

        expect(
          updateCalls,
        ).toHaveLength(
          1,
        )

        expect(
          JSON.stringify(
            updateCalls[0],
          ),
        ).toContain(
          '"status":"completed"',
        )

        expect(
          JSON.stringify(
            updateCalls[0],
          ),
        ).toContain(
          '"decision":"autoPublish"',
        )
      },
    )

    it(
      'marks the audit run failed and rethrows the original evaluation error',
      async () => {
        const updateCalls:
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
              updateCalls.push(
                input,
              )

              return fakeRun({
                status:
                  'failed',
              })
            },
        } as unknown as
          FlashEngineRunWriterPayload

        const providerError =
          new Error(
            'SECRET_PROVIDER_DETAIL_MUST_NOT_PERSIST',
          )

        await expect(
          runFlashEngineEvaluationWithAuditPersistence({
            payload,

            audit: {
              flashId:
                7,

              runId:
                'runtime:test',

              provider:
                'anthropic',

              model:
                'test-model',

              engineVersion:
                'test-engine',

              completedAt:
                '2026-09-09T09:02:00.000Z',
            },

            evaluate:
              async () => {
                throw providerError
              },
          }),
        ).rejects.toBe(
          providerError,
        )

        expect(
          updateCalls,
        ).toHaveLength(
          1,
        )

        const persisted =
          JSON.stringify(
            updateCalls[0],
          )

        expect(
          persisted,
        ).toContain(
          'FLASH_RUNTIME_EVALUATION_FAILED',
        )

        expect(
          persisted,
        ).toContain(
          'Flash runtime evaluation failed.',
        )

        expect(
          persisted,
        ).not.toContain(
          'SECRET_PROVIDER_DETAIL_MUST_NOT_PERSIST',
        )
      },
    )

    it(
      'does not evaluate when creating the running audit record fails',
      async () => {
        let evaluations =
          0

        const startError =
          new Error(
            'start failed',
          )

        const payload = {
          create:
            async () => {
              throw startError
            },

          update:
            async () =>
              fakeRun(),
        } as unknown as
          FlashEngineRunWriterPayload

        await expect(
          runFlashEngineEvaluationWithAuditPersistence({
            payload,

            audit: {
              flashId:
                7,

              runId:
                'runtime:test',

              provider:
                'anthropic',

              model:
                'test-model',

              engineVersion:
                'test-engine',
            },

            evaluate:
              async () => {
                evaluations +=
                  1

                return evaluationFixture()
              },
          }),
        ).rejects.toBe(
          startError,
        )

        expect(
          evaluations,
        ).toBe(
          0,
        )
      },
    )

    it(
      'marks the run failed when audit completion persistence fails',
      async () => {
        const updateCalls:
          unknown[] = []

        const completionError =
          new Error(
            'SECRET_COMPLETION_DETAIL_MUST_NOT_PERSIST',
          )

        let updateAttempt =
          0

        const payload = {
          create:
            async () =>
              fakeRun(),

          update:
            async (
              input:
                unknown,
            ) => {
              updateAttempt +=
                1

              updateCalls.push(
                input,
              )

              if (
                updateAttempt ===
                1
              ) {
                throw completionError
              }

              return fakeRun({
                status:
                  'failed',

                errorCode:
                  'FLASH_RUNTIME_AUDIT_COMPLETION_FAILED',

                errorMessage:
                  'Flash runtime audit completion failed.',
              })
            },
        } as unknown as
          FlashEngineRunWriterPayload

        await expect(
          runFlashEngineEvaluationWithAuditPersistence({
            payload,

            audit: {
              flashId:
                7,

              runId:
                'runtime:test',

              provider:
                'anthropic',

              model:
                'test-model',

              engineVersion:
                'test-engine',

              completedAt:
                '2026-09-09T09:03:00.000Z',
            },

            evaluate:
              async () =>
                evaluationFixture(),
          }),
        ).rejects.toBe(
          completionError,
        )

        expect(
          updateCalls,
        ).toHaveLength(
          2,
        )

        const failedPersistence =
          JSON.stringify(
            updateCalls[1],
          )

        expect(
          failedPersistence,
        ).toContain(
          'FLASH_RUNTIME_AUDIT_COMPLETION_FAILED',
        )

        expect(
          failedPersistence,
        ).toContain(
          'Flash runtime audit completion failed.',
        )

        expect(
          failedPersistence,
        ).not.toContain(
          'SECRET_COMPLETION_DETAIL_MUST_NOT_PERSIST',
        )
      },
    )
  },
)
