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
  requeueFailedFlashEngineEvaluationJob,
  type RequeueFailedFlashEngineEvaluationJobOptions,
} from '@/lib/flash/jobs/requeueFailedFlashEngineEvaluationJob'

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

interface SourceJobOverrides {
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

function sourceFailedJob(
  overrides:
    SourceJobOverrides = {},
) {
  return {
    id:
      73,

    taskSlug:
      FLASH_ENGINE_TASK_SLUG,

    queue:
      FLASH_ENGINE_MANUAL_QUEUE,

    completedAt:
      null,

    hasError:
      true,

    processing:
      false,

    totalTried:
      1,

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
  sourceJob =
    sourceFailedJob(),
  pendingJobs = [],
}: {
  sourceJob?:
    ReturnType<
      typeof sourceFailedJob
    >

  pendingJobs?:
    Record<string, unknown>[]
} = {}) {
  const findByID =
    vi.fn(
      async () =>
        sourceJob,
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
              RequeueFailedFlashEngineEvaluationJobOptions[
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
    RequeueFailedFlashEngineEvaluationJobOptions[
      'payloadFactory'
    ],
): RequeueFailedFlashEngineEvaluationJobOptions {
  return {
    payloadFactory,

    failedJobId:
      73,

    allowJobWrite:
      true,

    allowProviderRequests:
      true,

    environment:
      stagingEnvironment,
  }
}

describe(
  'controlled failed Flash Engine job requeue',
  () => {
    it(
      'rejects an invalid failed job ID before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFailedFlashEngineEvaluationJob({
            ...baseOptions(
              payloadFactory,
            ),

            failedJobId:
              0,
          }),
        ).rejects.toThrow(
          'Invalid failed Flash Engine job ID: 0',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks retry writes before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFailedFlashEngineEvaluationJob({
            ...baseOptions(
              payloadFactory,
            ),

            allowJobWrite:
              false,
          }),
        ).rejects.toThrow(
          'Flash Engine retry job writes are blocked.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks provider-capable retry jobs before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          requeueFailedFlashEngineEvaluationJob({
            ...baseOptions(
              payloadFactory,
            ),

            allowProviderRequests:
              false,
          }),
        ).rejects.toThrow(
          'Provider requests are not authorized for this Flash Engine retry job.',
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
          requeueFailedFlashEngineEvaluationJob({
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
      'rejects a source job from another task',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                taskSlug:
                  'schedulePublish',
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not an evaluateFlashEngine task.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a source job from another queue',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                queue:
                  'default',
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not in the flash-engine-manual queue.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a source job that is still processing',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                processing:
                  true,
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is still processing.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a source job that is not failed',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                hasError:
                  false,
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not marked as failed.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires at least one recorded attempt',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                totalTried:
                  0,
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 has no recorded attempt.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects invalid source input',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                input:
                  null,
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 has invalid input.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires the source job to remain provider-authorized',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            sourceJob:
              sourceFailedJob({
                input: {
                  flashId:
                    7,

                  model:
                    'claude-test-model',

                  allowProviderRequests:
                    false,
                },
              }),
          })

        await expect(
          requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
          ),
        ).rejects.toThrow(
          'Job 73 is not provider-authorized.',
        )

        expect(
          queue,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'queues a fresh equivalent job while preserving the source job',
      async () => {
        const {
          payloadFactory,
          findByID,
          find,
          queue,
        } =
          createPayloadFactory()

        const result =
          await requeueFailedFlashEngineEvaluationJob(
            baseOptions(
              payloadFactory,
            ),
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
          find,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          queue,
        ).toHaveBeenCalledTimes(
          1,
        )

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
          sourceJobId:
            73,

          retryJobId:
            91,

          flashId:
            7,

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
        const pending =
          pendingEquivalentJob()

        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory({
            pendingJobs: [
              pending,
            ],
          })

        const result =
          await requeueFailedFlashEngineEvaluationJob(
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
