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
  assertFlashEngineRunStagingEnvironment,
  runFlashEngineEvaluationJobByID,
  type RunFlashEngineEvaluationJobByIDOptions,
} from '@/lib/flash/jobs/runFlashEngineEvaluationJobByID'

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

    PAYLOAD_DB_PUSH:
      'false',

    ANTHROPIC_API_KEY:
      'test-anthropic-key',
  } as NodeJS.ProcessEnv

interface MockJobOverrides {
  taskSlug?:
    string | null

  queue?:
    string | null

  completedAt?:
    string | null

  hasError?:
    boolean

  processing?:
    boolean

  totalTried?:
    number

  input?:
    unknown
}

function createPayloadFactory(
  overrides:
    MockJobOverrides =
      {},
) {
  const job = {
    id:
      73,

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

    ...overrides,
  }

  const findByID =
    vi.fn(
      async () =>
        job,
    )

  const runResult = {
    jobStatus: {
      '73': {
        status:
          'success',
      },
    },

    remainingJobsFromQueried:
      0,
  }

  const runByID =
    vi.fn(
      async () =>
        runResult,
    )

  const payloadFactory =
    vi.fn(
      async () =>
        ({
          findByID,

          jobs: {
            runByID,
          },
        }) as unknown as
          Awaited<
            ReturnType<
              RunFlashEngineEvaluationJobByIDOptions[
                'payloadFactory'
              ]
            >
          >,
    )

  return {
    payloadFactory,
    findByID,
    runByID,
    runResult,
  }
}

function baseOptions(
  payloadFactory:
    RunFlashEngineEvaluationJobByIDOptions[
      'payloadFactory'
    ],
): RunFlashEngineEvaluationJobByIDOptions {
  return {
    payloadFactory,

    jobId:
      73,

    expectedFlashId:
      7,

    expectedModel:
      'claude-test-model',

    allowJobRun:
      true,

    allowProviderRequests:
      true,

    environment:
      stagingEnvironment,
  }
}

describe(
  'controlled Flash Engine runByID',
  () => {
    it(
      'declares the expected task and manual queue',
      () => {
        expect(
          FLASH_ENGINE_TASK_SLUG,
        ).toBe(
          'evaluateFlashEngine',
        )

        expect(
          FLASH_ENGINE_MANUAL_QUEUE,
        ).toBe(
          'flash-engine-manual',
        )
      },
    )

    it(
      'rejects an invalid job ID before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            jobId:
              0,
          }),
        ).rejects.toThrow(
          'Invalid Flash Engine job ID: 0',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects an invalid expected Flash ID before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            expectedFlashId:
              0,
          }),
        ).rejects.toThrow(
          'Invalid expected Flash ID: 0',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a blank expected model before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            expectedModel:
              '   ',
          }),
        ).rejects.toThrow(
          'Expected Anthropic model is required.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks execution before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            allowJobRun:
              false,
          }),
        ).rejects.toThrow(
          'Flash Engine job execution is blocked.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks unauthorized provider requests before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            allowProviderRequests:
              false,
          }),
        ).rejects.toThrow(
          'Provider requests are not authorized for Flash Engine execution.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a non-STAGING environment before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            environment: {
              ...stagingEnvironment,

              RAILWAY_PROJECT_ID:
                'wrong-project',
            },
          }),
        ).rejects.toThrow(
          'Flash Engine execution is restricted to the configured STAGING environment.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires PAYLOAD_DB_PUSH=false and a provider key',
      () => {
        expect(
          () =>
            assertFlashEngineRunStagingEnvironment({
              RAILWAY_PROJECT_ID:
                FLASH_ENGINE_STAGING_RAILWAY_TARGET
                  .projectId,

              RAILWAY_ENVIRONMENT_ID:
                FLASH_ENGINE_STAGING_RAILWAY_TARGET
                  .environmentId,

              RAILWAY_SERVICE_ID:
                FLASH_ENGINE_STAGING_RAILWAY_TARGET
                  .serviceId,

              PAYLOAD_DB_PUSH:
                'true',

              ANTHROPIC_API_KEY:
                '',
            }),
        ).toThrow(
          'Environment mismatch: PAYLOAD_DB_PUSH, ANTHROPIC_API_KEY.',
        )
      },
    )

    it(
      'rejects the wrong task without running the job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            taskSlug:
              'schedulePublish',
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not an evaluateFlashEngine task.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects the wrong queue without running the job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            queue:
              'default',
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not in the flash-engine-manual queue.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects an already completed job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            completedAt:
              '2026-09-10T10:00:00.000Z',
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is already completed.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a failed job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            hasError:
              true,
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is already marked as failed.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects an already processing job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            processing:
              true,
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is already processing.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects an already attempted job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            totalTried:
              1,
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 has already been attempted.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects invalid job input',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            input:
              null,
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 has invalid input.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a Flash ID mismatch',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            input: {
              flashId:
                999,

              model:
                'claude-test-model',

              allowProviderRequests:
                true,
            },
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 Flash ID does not match the authorized Flash ID.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a model mismatch',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            input: {
              flashId:
                7,

              model:
                'different-model',

              allowProviderRequests:
                true,
            },
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 model does not match the authorized model.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a job whose stored provider authorization is false',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory({
            input: {
              flashId:
                7,

              model:
                'claude-test-model',

              allowProviderRequests:
                false,
            },
          })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not provider-authorized.',
        )

        expect(
          runByID,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a runByID result without a status for the authorized job',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory()

        runByID.mockResolvedValueOnce({
          remainingJobsFromQueried:
            0,
        })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 did not produce an execution status.',
        )

        expect(
          runByID,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'rejects a non-success runByID status',
      async () => {
        const {
          payloadFactory,
          runByID,
        } =
          createPayloadFactory()

        runByID.mockResolvedValueOnce({
          jobStatus: {
            '73': {
              status:
                'error-reached-max-retries',
            },
          },

          remainingJobsFromQueried:
            0,
        })

        await expect(
          runFlashEngineEvaluationJobByID(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 execution failed with status: error-reached-max-retries.',
        )

        expect(
          runByID,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'runs exactly the verified job ID and returns controlled metadata',
      async () => {
        const {
          payloadFactory,
          findByID,
          runByID,
          runResult,
        } =
          createPayloadFactory()

        const result =
          await runFlashEngineEvaluationJobByID({
            ...baseOptions(
              payloadFactory,
            ),

            expectedModel:
              '  claude-test-model  ',
          })

        expect(
          payloadFactory,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          findByID,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          findByID,
        ).toHaveBeenCalledWith({
          collection:
            'payload-jobs',

          id:
            73,

          depth:
            0,

          overrideAccess:
            true,
        })

        expect(
          runByID,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          runByID,
        ).toHaveBeenCalledWith({
          id:
            73,

          overrideAccess:
            true,

          silent:
            false,
        })

        expect(
          result,
        ).toEqual({
          result:
            runResult,

          jobId:
            73,

          flashId:
            7,

          model:
            'claude-test-model',

          task:
            'evaluateFlashEngine',

          queue:
            'flash-engine-manual',
        })
      },
    )
  },
)
