import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks =
  vi.hoisted(
    () => {
      const producers = {
        factualClaimExtraction:
          vi.fn(),

        factualVerification:
          vi.fn(),

        safety:
          vi.fn(),

        medicalInterpretation:
          vi.fn(),

        extraordinaryClaim:
          vi.fn(),

        regulatoryStatus:
          vi.fn(),

        contradiction:
          vi.fn(),
      }

      return {
        anthropicConstructor:
          vi.fn(),

        evaluate:
          vi.fn(),

        producers,

        createFactualClaimExtraction:
          vi.fn(
            () =>
              producers
                .factualClaimExtraction,
          ),

        createFactualVerification:
          vi.fn(
            () =>
              producers
                .factualVerification,
          ),

        createSafety:
          vi.fn(
            () =>
              producers
                .safety,
          ),

        createMedicalInterpretation:
          vi.fn(
            () =>
              producers
                .medicalInterpretation,
          ),

        createExtraordinaryClaim:
          vi.fn(
            () =>
              producers
                .extraordinaryClaim,
          ),

        createRegulatoryStatus:
          vi.fn(
            () =>
              producers
                .regulatoryStatus,
          ),

        createContradiction:
          vi.fn(
            () =>
              producers
                .contradiction,
          ),
      }
    },
  )

vi.mock(
  '@anthropic-ai/sdk',
  () => ({
    default:
      class AnthropicMock {
        constructor(
          options:
            unknown,
        ) {
          mocks
            .anthropicConstructor(
              options,
            )
        }
      },
  }),
)

vi.mock(
  '@/lib/flash/audit/payloadProducedFactualRuntimeWithAuditPersistence',
  () => ({
    evaluateFlashRuntimeWithProducedFactualEvidenceAndAuditPersistence:
      mocks.evaluate,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicFactualClaimExtractionSemanticProducer',
  () => ({
    createAnthropicFlashFactualClaimExtractionSemanticProducer:
      mocks
        .createFactualClaimExtraction,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicFactualVerificationSemanticProducer',
  () => ({
    createAnthropicFlashFactualVerificationSemanticProducer:
      mocks
        .createFactualVerification,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicSafetySemanticProducer',
  () => ({
    createAnthropicFlashSafetySemanticProducer:
      mocks.createSafety,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicMedicalInterpretationSemanticProducer',
  () => ({
    createAnthropicFlashMedicalInterpretationSemanticProducer:
      mocks
        .createMedicalInterpretation,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicExtraordinaryClaimSemanticProducer',
  () => ({
    createAnthropicFlashExtraordinaryClaimSemanticProducer:
      mocks
        .createExtraordinaryClaim,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicRegulatoryStatusSemanticProducer',
  () => ({
    createAnthropicFlashRegulatoryStatusSemanticProducer:
      mocks
        .createRegulatoryStatus,
  }),
)

vi.mock(
  '@/lib/flash/semanticEvidence/anthropicContradictionSemanticProducer',
  () => ({
    createAnthropicFlashContradictionSemanticProducer:
      mocks
        .createContradiction,
  }),
)

import {
  EvaluateFlashEngineTask,
  type EvaluateFlashEngineTaskInput,
} from '@/lib/flash/jobs/evaluateFlashEngineTask'

type EvaluateFlashEngineHandler =
  Exclude<
    typeof EvaluateFlashEngineTask.handler,
    string
  >

type EvaluateFlashEngineHandlerArgs =
  Parameters<
    EvaluateFlashEngineHandler
  >[0]

const payload =
  {
    marker:
      'payload-test-double',
  }

let originalApiKey:
  string | undefined

function handler():
  EvaluateFlashEngineHandler {
  const configuredHandler =
    EvaluateFlashEngineTask
      .handler

  if (
    typeof configuredHandler !==
    'function'
  ) {
    throw new Error(
      'EvaluateFlashEngineTask handler is not a function.',
    )
  }

  return configuredHandler
}

function handlerArgs(
  input:
    EvaluateFlashEngineTaskInput,
  jobId = 73,
):
  EvaluateFlashEngineHandlerArgs {
  return {
    input,

    job:
      {
        id:
          jobId,
      } as unknown as
        EvaluateFlashEngineHandlerArgs[
          'job'
        ],

    req:
      {
        payload,
      } as unknown as
        EvaluateFlashEngineHandlerArgs[
          'req'
        ],

    inlineTask:
      vi.fn() as unknown as
        EvaluateFlashEngineHandlerArgs[
          'inlineTask'
        ],

    tasks:
      {} as
        EvaluateFlashEngineHandlerArgs[
          'tasks'
        ],
  }
}

function evaluationResult(
  decision:
    | 'autoPublish'
    | 'review'
    | 'blocked',
) {
  return {
    evaluation: {
      semanticRuntime: {
        runtime: {
          runtimeDecision: {
            decision: {
              decision,
            },
          },
        },
      },
    },
  }
}

describe(
  'EvaluateFlashEngineTask',
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        originalApiKey =
          process.env
            .ANTHROPIC_API_KEY

        delete process.env
          .ANTHROPIC_API_KEY
      },
    )

    afterEach(
      () => {
        if (
          originalApiKey ===
          undefined
        ) {
          delete process.env
            .ANTHROPIC_API_KEY

          return
        }

        process.env
          .ANTHROPIC_API_KEY =
          originalApiKey
      },
    )

    it(
      'declares the minimal serializable Payload task contract',
      () => {
        expect(
          EvaluateFlashEngineTask
            .slug,
        ).toBe(
          'evaluateFlashEngine',
        )

        expect(
          EvaluateFlashEngineTask
            .retries,
        ).toBe(
          0,
        )

        expect(
          EvaluateFlashEngineTask
            .inputSchema,
        ).toEqual(
          [
            {
              name:
                'flashId',
              type:
                'number',
              required:
                true,
            },
            {
              name:
                'model',
              type:
                'text',
              required:
                true,
            },
            {
              name:
                'allowProviderRequests',
              type:
                'checkbox',
              required:
                true,
              defaultValue:
                false,
            },
          ],
        )

        expect(
          EvaluateFlashEngineTask
            .outputSchema,
        ).toEqual(
          [
            {
              name:
                'runId',
              type:
                'text',
              required:
                true,
            },
            {
              name:
                'decision',
              type:
                'select',
              required:
                true,
              options: [
                {
                  label:
                    'Auto Publish',
                  value:
                    'autoPublish',
                },
                {
                  label:
                    'Review',
                  value:
                    'review',
                },
                {
                  label:
                    'Blocked',
                  value:
                    'blocked',
                },
              ],
            },
          ],
        )
      },
    )

    it(
      'rejects an invalid Flash ID before provider setup',
      async () => {
        await expect(
          handler()(
            handlerArgs({
              flashId:
                0,

              model:
                'test-model',

              allowProviderRequests:
                true,
            }),
          ),
        ).rejects.toThrow(
          'Invalid Flash ID: 0',
        )

        expect(
          mocks
            .anthropicConstructor,
        ).not.toHaveBeenCalled()

        expect(
          mocks.evaluate,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects a blank model before provider setup',
      async () => {
        await expect(
          handler()(
            handlerArgs({
              flashId:
                7,

              model:
                '   ',

              allowProviderRequests:
                true,
            }),
          ),
        ).rejects.toThrow(
          'Anthropic model is required.',
        )

        expect(
          mocks
            .anthropicConstructor,
        ).not.toHaveBeenCalled()

        expect(
          mocks.evaluate,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'blocks provider requests before API key access and evaluation',
      async () => {
        await expect(
          handler()(
            handlerArgs({
              flashId:
                7,

              model:
                'test-model',

              allowProviderRequests:
                false,
            }),
          ),
        ).rejects.toThrow(
          'Provider requests are blocked for this Flash Engine job.',
        )

        expect(
          mocks
            .anthropicConstructor,
        ).not.toHaveBeenCalled()

        expect(
          mocks
            .createFactualClaimExtraction,
        ).not.toHaveBeenCalled()

        expect(
          mocks.evaluate,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'requires the Anthropic API key only after explicit provider approval',
      async () => {
        await expect(
          handler()(
            handlerArgs({
              flashId:
                7,

              model:
                'test-model',

              allowProviderRequests:
                true,
            }),
          ),
        ).rejects.toThrow(
          'ANTHROPIC_API_KEY is not configured.',
        )

        expect(
          mocks
            .anthropicConstructor,
        ).not.toHaveBeenCalled()

        expect(
          mocks.evaluate,
        ).not.toHaveBeenCalled()
      },
    )

    it.each(
      [
        'autoPublish',
        'review',
        'blocked',
      ] as const,
    )(
      'returns the typed %s decision from the persistent runtime',
      async (
        decision,
      ) => {
        process.env
          .ANTHROPIC_API_KEY =
          'test-api-key'

        mocks
          .evaluate
          .mockResolvedValue(
            evaluationResult(
              decision,
            ),
          )

        const result =
          await handler()(
            handlerArgs(
              {
                flashId:
                  7,

                model:
                  '  test-model  ',

                allowProviderRequests:
                  true,
              },
              73,
            ),
          )

        expect(
          mocks
            .anthropicConstructor,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          mocks
            .anthropicConstructor,
        ).toHaveBeenCalledWith({
          apiKey:
            'test-api-key',
        })

        const producerOptions =
          expect.objectContaining({
            model:
              'test-model',
            client:
              expect.anything(),
          })

        expect(
          mocks
            .createFactualClaimExtraction,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks
            .createFactualVerification,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks
            .createSafety,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks
            .createMedicalInterpretation,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks
            .createExtraordinaryClaim,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks
            .createRegulatoryStatus,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks
            .createContradiction,
        ).toHaveBeenCalledWith(
          producerOptions,
        )

        expect(
          mocks.evaluate,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          mocks.evaluate,
        ).toHaveBeenCalledWith(
          {
            payload,

            flashId:
              7,

            runId:
              'flash-engine-job:73',

            provider:
              'anthropic',

            model:
              'test-model',

            engineVersion:
              'flash-payload-job-v1',

            factualClaimExtractionProducer:
              mocks.producers
                .factualClaimExtraction,

            factualVerificationProducer:
              mocks.producers
                .factualVerification,

            safetyProducer:
              mocks.producers
                .safety,

            medicalInterpretationProducer:
              mocks.producers
                .medicalInterpretation,

            extraordinaryClaimProducer:
              mocks.producers
                .extraordinaryClaim,

            regulatoryStatusProducer:
              mocks.producers
                .regulatoryStatus,

            contradictionProducer:
              mocks.producers
                .contradiction,

            semanticEvidence:
              {},
          },
        )

        expect(
          result,
        ).toEqual({
          output: {
            runId:
              'flash-engine-job:73',

            decision,
          },
        })
      },
    )
  },
)
