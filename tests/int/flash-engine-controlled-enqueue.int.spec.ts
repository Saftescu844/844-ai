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
  assertFlashEngineStagingRailwayTarget,
  queueFlashEngineEvaluationJob,
  type QueueFlashEngineEvaluationJobOptions,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

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

function createPayloadFactory() {
  const queue =
    vi.fn(
      async () => ({
        id:
          73,
      }),
    )

  const payloadFactory =
    vi.fn(
      async () =>
        ({
          jobs: {
            queue,
          },
        }) as unknown as
          Awaited<
            ReturnType<
              QueueFlashEngineEvaluationJobOptions[
                'payloadFactory'
              ]
            >
          >,
    )

  return {
    payloadFactory,
    queue,
  }
}

describe(
  'controlled Flash Engine enqueue',
  () => {
    it(
      'declares a dedicated manual queue',
      () => {
        expect(
          FLASH_ENGINE_MANUAL_QUEUE,
        ).toBe(
          'flash-engine-manual',
        )

        expect(
          FLASH_ENGINE_TASK_SLUG,
        ).toBe(
          'evaluateFlashEngine',
        )
      },
    )

    it(
      'rejects an invalid Flash ID before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          queueFlashEngineEvaluationJob({
            payloadFactory,

            flashId:
              0,

            model:
              'test-model',

            allowJobWrite:
              true,

            allowProviderRequests:
              true,

            environment:
              stagingEnvironment,
          }),
        ).rejects.toThrow(
          'Invalid Flash ID: 0',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a blank model before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          queueFlashEngineEvaluationJob({
            payloadFactory,

            flashId:
              7,

            model:
              '   ',

            allowJobWrite:
              true,

            allowProviderRequests:
              true,

            environment:
              stagingEnvironment,
          }),
        ).rejects.toThrow(
          'Anthropic model is required.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks job writes before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          queueFlashEngineEvaluationJob({
            payloadFactory,

            flashId:
              7,

            model:
              'test-model',

            allowJobWrite:
              false,

            allowProviderRequests:
              true,

            environment:
              stagingEnvironment,
          }),
        ).rejects.toThrow(
          'Flash Engine job writes are blocked.',
        )

        expect(
          payloadFactory,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks unauthorized provider-capable jobs before Payload initialization',
      async () => {
        const {
          payloadFactory,
        } =
          createPayloadFactory()

        await expect(
          queueFlashEngineEvaluationJob({
            payloadFactory,

            flashId:
              7,

            model:
              'test-model',

            allowJobWrite:
              true,

            allowProviderRequests:
              false,

            environment:
              stagingEnvironment,
          }),
        ).rejects.toThrow(
          'Provider requests are not authorized for this Flash Engine job.',
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
          queueFlashEngineEvaluationJob({
            payloadFactory,

            flashId:
              7,

            model:
              'test-model',

            allowJobWrite:
              true,

            allowProviderRequests:
              true,

            environment: {
              ...stagingEnvironment,

              RAILWAY_PROJECT_ID:
                'wrong-project',
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
      'reports all mismatched Railway identifiers',
      () => {
        expect(
          () =>
            assertFlashEngineStagingRailwayTarget(
              {
                RAILWAY_PROJECT_ID:
                  'wrong-project',

                RAILWAY_ENVIRONMENT_ID:
                  'wrong-environment',

                RAILWAY_SERVICE_ID:
                  'wrong-service',
              },
            ),
        ).toThrow(
          'Target mismatch: RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID, RAILWAY_SERVICE_ID.',
        )
      },
    )

    it(
      'queues exactly one provider-authorized task in the manual queue',
      async () => {
        const {
          payloadFactory,
          queue,
        } =
          createPayloadFactory()

        const result =
          await queueFlashEngineEvaluationJob({
            payloadFactory,

            flashId:
              7,

            model:
              '  claude-test-model  ',

            allowJobWrite:
              true,

            allowProviderRequests:
              true,

            environment:
              stagingEnvironment,
          })

        expect(
          payloadFactory,
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
            'evaluateFlashEngine',

          queue:
            'flash-engine-manual',

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
          job: {
            id:
              73,
          },

          queue:
            'flash-engine-manual',

          task:
            'evaluateFlashEngine',
        })
      },
    )
  },
)
