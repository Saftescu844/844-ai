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
  runFlashEngineManualQueueOnce,
  type RunFlashEngineManualQueueOnceOptions,
} from '@/lib/flash/jobs/runFlashEngineManualQueueOnce'

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

function createPayloadFactory(
  runResult:
    unknown =
      {
        jobStatus: {
          '81': {
            status:
              'success',
          },
        },

        remainingJobsFromQueried:
          0,
      },
) {
  const run =
    vi.fn(
      async () =>
        runResult,
    )

  const payloadFactory =
    vi.fn(
      async () =>
        ({
          jobs: {
            run,
          },
        }) as unknown as
          Awaited<
            ReturnType<
              RunFlashEngineManualQueueOnceOptions[
                'payloadFactory'
              ]
            >
          >,
    )

  return {
    payloadFactory,
    run,
  }
}

function baseOptions(
  payloadFactory:
    RunFlashEngineManualQueueOnceOptions[
      'payloadFactory'
    ],
): RunFlashEngineManualQueueOnceOptions {
  return {
    payloadFactory,

    allowJobRun:
      true,

    allowProviderRequests:
      true,

    environment:
      stagingEnvironment,
  }
}

describe(
  'controlled Flash Engine run-next',
  () => {
    it(
      'blocks execution before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineManualQueueOnce({
            ...baseOptions(
              payloadFactory,
            ),

            allowJobRun:
              false,
          }),
        ).rejects.toThrow(
          'Flash Engine manual queue execution is blocked.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks provider requests before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineManualQueueOnce({
            ...baseOptions(
              payloadFactory,
            ),

            allowProviderRequests:
              false,
          }),
        ).rejects.toThrow(
          'Provider requests are not authorized for Flash Engine manual queue execution.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a non-STAGING project or environment before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineManualQueueOnce({
            ...baseOptions(
              payloadFactory,
            ),

            environment: {
              ...stagingEnvironment,

              RAILWAY_ENVIRONMENT_ID:
                'wrong-environment',
            },
          }),
        ).rejects.toThrow(
          'Flash Engine run-next execution is restricted to the configured STAGING environment.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'allows a separate Railway service inside the exact STAGING project and environment',
      async () => {
        const {
          payloadFactory,
          run,
        } =
          createPayloadFactory()

        const result =
          await runFlashEngineManualQueueOnce({
            ...baseOptions(
              payloadFactory,
            ),

            environment: {
              ...stagingEnvironment,

              RAILWAY_SERVICE_ID:
                'flash-engine-worker-service',
            },
          })

        expect(
          payloadFactory,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          run,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          result.executed,
        ).toBe(
          true,
        )
      },
    )

    it(
      'requires PAYLOAD_DB_PUSH=false and an Anthropic key before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          runFlashEngineManualQueueOnce({
            ...baseOptions(
              payloadFactory,
            ),

            environment: {
              ...stagingEnvironment,

              PAYLOAD_DB_PUSH:
                'true',

              ANTHROPIC_API_KEY:
                '',
            },
          }),
        ).rejects.toThrow(
          'Environment mismatch: PAYLOAD_DB_PUSH, ANTHROPIC_API_KEY.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'runs at most one eligible provider-authorized unattempted Flash Engine job in FIFO order',
      async () => {
        const {
          payloadFactory,
          run,
        } =
          createPayloadFactory()

        const result =
          await runFlashEngineManualQueueOnce(
            baseOptions(
              payloadFactory,
            ),
          )

        expect(
          payloadFactory,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          run,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          run,
        ).toHaveBeenCalledWith({
          queue:
            FLASH_ENGINE_MANUAL_QUEUE,

          limit:
            1,

          processingOrder:
            'createdAt',

          sequential:
            true,

          overrideAccess:
            true,

          where: {
            and: [
              {
                taskSlug: {
                  equals:
                    FLASH_ENGINE_TASK_SLUG,
                },
              },
              {
                totalTried: {
                  equals:
                    0,
                },
              },
              {
                'input.allowProviderRequests': {
                  equals:
                    true,
                },
              },
            ],
          },
        })

        expect(
          result.executed,
        ).toBe(
          true,
        )

        expect(
          result.jobId,
        ).toBe(
          '81',
        )

        expect(
          result.executionStatus,
        ).toBe(
          'success',
        )
      },
    )

    it(
      'treats an empty eligible queue as a successful no-op',
      async () => {
        const {
          payloadFactory,
          run,
        } =
          createPayloadFactory({
            noJobsRemaining:
              true,

            remainingJobsFromQueried:
              0,
          })

        const result =
          await runFlashEngineManualQueueOnce(
            baseOptions(
              payloadFactory,
            ),
          )

        expect(
          run,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          result.executed,
        ).toBe(
          false,
        )

        expect(
          result.jobId,
        ).toBeNull()

        expect(
          result.executionStatus,
        ).toBeNull()
      },
    )

    it(
      'rejects a non-success execution status',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory({
            jobStatus: {
              '81': {
                status:
                  'error-reached-max-retries',
              },
            },

            remainingJobsFromQueried:
              0,
          })

        await expect(
          runFlashEngineManualQueueOnce(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Flash Engine manual queue job 81 execution failed with status: error-reached-max-retries.',
        )
      },
    )

    it(
      'rejects an ambiguous result containing more than one job status',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory({
            jobStatus: {
              '81': {
                status:
                  'success',
              },

              '82': {
                status:
                  'success',
              },
            },

            remainingJobsFromQueried:
              0,
          })

        await expect(
          runFlashEngineManualQueueOnce(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Flash Engine manual queue runner returned 2 job statuses; expected at most one.',
        )
      },
    )
  },
)
