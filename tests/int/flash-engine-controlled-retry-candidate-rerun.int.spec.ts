import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  FLASH_ENGINE_MANUAL_QUEUE,
  FLASH_ENGINE_STAGING_RAILWAY_TARGET,
  FLASH_ENGINE_TASK_SLUG,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  flashEngineAuditHasRetryCandidate,
  requeueFlashEngineRetryCandidateRun,
  type RequeueFlashEngineRetryCandidateRunOptions,
} from '@/lib/flash/jobs/requeueFlashEngineRetryCandidateRun'

const stagingEnvironment =
  {
    RAILWAY_PROJECT_ID:
      FLASH_ENGINE_STAGING_RAILWAY_TARGET
        .projectId,

    RAILWAY_ENVIRONMENT_ID:
      FLASH_ENGINE_STAGING_RAILWAY_TARGET
        .environmentId,

    RAILWAY_SERVICE_ID:
      FLASH_ENGINE_STAGING_RAILWAY_TARGET
        .serviceId,
  } as NodeJS.ProcessEnv

interface SourceRunOverrides {
  status?:
    string

  provider?:
    string

  flashIdSnapshot?:
    unknown

  model?:
    unknown

  evidenceSummary?:
    unknown

  decision?:
    string | null
}

function sourceCompletedRetryCandidateRun(
  overrides:
    SourceRunOverrides = {},
) {
  return {
    id:
      41,

    runId:
      'flash-engine-job:73',

    status:
      'completed',

    provider:
      'anthropic',

    flashIdSnapshot:
      7,

    model:
      'claude-test-model',

    decision:
      'review',

    evidenceSummary: {
      factual: {
        claimExtractionRecoveryDisposition:
          null,

        verificationRecoveryDisposition:
          'retryCandidate',
      },

      semantic: {
        contradictionsRecoveryDisposition:
          null,

        safetyRecoveryDisposition:
          null,

        medicalInterpretationRecoveryDisposition:
          null,

        extraordinaryClaimRecoveryDisposition:
          null,

        regulatoryStatusRecoveryDisposition:
          null,
      },
    },

    ...overrides,
  }
}

function pendingEquivalentJob() {
  return {
    id:
      88,

    taskSlug:
      FLASH_ENGINE_TASK_SLUG,

    queue:
      FLASH_ENGINE_MANUAL_QUEUE,

    completedAt:
      null,

    hasError:
      false,

    processing:
      false,

    totalTried:
      0,

    input: {
      flashId:
        7,

      model:
        'claude-test-model',

      allowProviderRequests:
        true,
    },
  }
}

function createPayloadFactory({
  sourceRun =
    sourceCompletedRetryCandidateRun(),
  pendingJobs = [],
}: {
  sourceRun?:
    ReturnType<
      typeof sourceCompletedRetryCandidateRun
    >

  pendingJobs?:
    Record<string, unknown>[]
} = {}) {
  const findByID =
    vi.fn(
      async () =>
        sourceRun,
    )

  const find =
    vi.fn(
      async () => ({
        docs:
          pendingJobs,
      }),
    )

  const queue =
    vi.fn(
      async () => ({
        id:
          91,
      }),
    )

  const payloadFactory =
    vi.fn(
      async () =>
        ({
          findByID,
          find,

          jobs: {
            queue,
          },
        }) as unknown as
          Awaited<
            ReturnType<
              RequeueFlashEngineRetryCandidateRunOptions[
                'payloadFactory'
              ]
            >
          >,
    )

  return {
    payloadFactory,
    findByID,
    find,
    queue,
  }
}

function baseOptions(
  payloadFactory:
    RequeueFlashEngineRetryCandidateRunOptions[
      'payloadFactory'
    ],
): RequeueFlashEngineRetryCandidateRunOptions {
  return {
    payloadFactory,

    runRecordId:
      41,

    allowJobWrite:
      true,

    allowProviderRequests:
      true,

    environment:
      stagingEnvironment,
  }
}

describe(
  'controlled retry-candidate audit rerun',
  () => {
    it(
      'detects retry candidates only in bounded factual/semantic audit fields',
      () => {
        expect(
          flashEngineAuditHasRetryCandidate({
            factual: {
              verificationRecoveryDisposition:
                'retryCandidate',
            },
          }),
        ).toBe(
          true,
        )

        expect(
          flashEngineAuditHasRetryCandidate({
            semantic: {
              safetyRecoveryDisposition:
                'retryCandidate',
            },
          }),
        ).toBe(
          true,
        )

        expect(
          flashEngineAuditHasRetryCandidate({
            factual: {
              safetyRecoveryDisposition:
                'retryCandidate',
            },
          }),
        ).toBe(
          false,
        )

        expect(
          flashEngineAuditHasRetryCandidate({
            arbitrary: {
              recoveryDisposition:
                'retryCandidate',
            },
          }),
        ).toBe(
          false,
        )

        expect(
          flashEngineAuditHasRetryCandidate(
            null,
          ),
        ).toBe(
          false,
        )
      },
    )

    it(
      'rejects an invalid audit run record ID before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFlashEngineRetryCandidateRun({
            ...baseOptions(
              payloadFactory,
            ),

            runRecordId:
              0,
          }),
        ).rejects.toThrow(
          'Invalid Flash Engine audit run record ID: 0',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires explicit job-write authorization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFlashEngineRetryCandidateRun({
            ...baseOptions(
              payloadFactory,
            ),

            allowJobWrite:
              false,
          }),
        ).rejects.toThrow(
          'Flash Engine retry-candidate job writes are blocked.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires explicit provider authorization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFlashEngineRetryCandidateRun({
            ...baseOptions(
              payloadFactory,
            ),

            allowProviderRequests:
              false,
          }),
        ).rejects.toThrow(
          'Provider requests are not authorized for this retry-candidate job.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a non-STAGING Railway target before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFlashEngineRetryCandidateRun({
            ...baseOptions(
              payloadFactory,
            ),

            environment: {
              ...stagingEnvironment,

              RAILWAY_SERVICE_ID:
                'wrong-service',
            },
          }),
        ).rejects.toThrow(
          'Flash Engine enqueue is restricted to the configured STAGING Railway target.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a source run that is not completed',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceRun:
              sourceCompletedRetryCandidateRun({
                status:
                  'failed',
              }),
          })

        await expect(
          requeueFlashEngineRetryCandidateRun(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Flash Engine audit run 41 is not completed.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a provider unsupported by the current queue task',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceRun:
              sourceCompletedRetryCandidateRun({
                provider:
                  'openai',
              }),
          })

        await expect(
          requeueFlashEngineRetryCandidateRun(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Flash Engine audit run 41 is not an Anthropic run supported by the current queue task.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires a retryCandidate disposition in the source audit',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceRun:
              sourceCompletedRetryCandidateRun({
                evidenceSummary: {
                  factual: {
                    verificationRecoveryDisposition:
                      'manualAssessment',
                  },

                  semantic: {
                    safetyRecoveryDisposition:
                      'doNotRetry',
                  },
                },
              }),
          })

        await expect(
          requeueFlashEngineRetryCandidateRun(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Flash Engine audit run 41 has no retryCandidate recovery disposition.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'queues a fresh equivalent job from the completed audit run',
      async () => {
        const {
          payloadFactory,
          findByID,
          queue,
        } =
          createPayloadFactory()

        const result =
          await requeueFlashEngineRetryCandidateRun(
            baseOptions(
              payloadFactory,
            ),
          )

        expect(
          findByID,
        ).toHaveBeenCalledWith({
          collection:
            'flash-engine-runs',

          id:
            41,

          depth:
            0,

          overrideAccess:
            true,
        })

        expect(
          queue,
        ).toHaveBeenCalledWith({
          task:
            FLASH_ENGINE_TASK_SLUG,

          queue:
            FLASH_ENGINE_MANUAL_QUEUE,

          overrideAccess:
            true,

          input: {
            flashId:
              7,

            model:
              'claude-test-model',

            allowProviderRequests:
              true,
          },
        })

        expect(
          result,
        ).toEqual({
          sourceRunRecordId:
            41,

          sourceRunId:
            'flash-engine-job:73',

          sourceDecision:
            'review',

          retryJobId:
            91,

          flashId:
            7,

          provider:
            'anthropic',

          model:
            'claude-test-model',

          task:
            FLASH_ENGINE_TASK_SLUG,

          queue:
            FLASH_ENGINE_MANUAL_QUEUE,

          reusedExisting:
            false,
        })
      },
    )

    it(
      'reuses an untouched equivalent pending job instead of duplicating it',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            pendingJobs: [
              pendingEquivalentJob(),
            ],
          })

        const result =
          await requeueFlashEngineRetryCandidateRun(
            baseOptions(
              payloadFactory,
            ),
          )

        expect(
          queue,
        ).not.toHaveBeenCalled()

        expect(
          result.retryJobId,
        ).toBe(
          88,
        )

        expect(
          result.reusedExisting,
        ).toBe(
          true,
        )
      },
    )
  },
)
