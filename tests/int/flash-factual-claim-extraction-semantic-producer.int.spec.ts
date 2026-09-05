import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  buildFlashFactualClaimExtractionSemanticPrompt,
  createFlashFactualClaimExtractionSemanticProducer,
  runFlashFactualClaimExtractionSemanticProducer,
} from '@/lib/flash/semanticEvidence/factualClaimExtractionSemanticProducer'

import {
  FlashSemanticEvidenceProducerError,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

function document(
  overrides:
    Partial<
      FlashSemanticDocument
    > = {},
):
  FlashSemanticDocument {
  return {
    flashId:
      10,

    language:
      'ro',

    title:
      'FDA a autorizat noul dispozitiv.',

    excerpt:
      'Compania a anunțat rezultatele studiului.',

    bodyText:
      [
        'Studiul a inclus 500 de participanți.',
        '',
        'Rezultatul principal a fost pozitiv.',
      ].join(
        '\n',
      ),

    metadata: {
      flashType:
        'research',

      informationStatus:
        'confirmed',

      riskLevel:
        'low',

      isHealthRelated:
        true,

      medicalEvidenceType:
        'clinicalStudy',

      clinicalValidationStatus:
        'underEvaluation',
    },

    ...overrides,
  } as FlashSemanticDocument
}

function producerWith(
  executor:
    FlashSemanticTextExecutor,
  {
    provider =
      'test-provider',
    model =
      'test-model',
  }: {
    provider?:
      string

    model?:
      string
  } = {},
) {
  return createFlashFactualClaimExtractionSemanticProducer({
    executor,
    provider,
    model,
  })
}

describe(
  'Flash factual claim extraction semantic producer',
  () => {
    it(
      'builds a provider-agnostic prompt without model-owned identities or publication decisions',
      () => {
        const prompt =
          buildFlashFactualClaimExtractionSemanticPrompt(
            document(),
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'externally verifiable factual assertions',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'do NOT return claimId',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'do NOT return citationId',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'do NOT return chunkId',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'do NOT return evidenceRef',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'do NOT verify claims against sources',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'do NOT return AUTO, REVIEW, BLOCK',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"bodyText": "Studiul a inclus 500 de participanți.',
        )
      },
    )

    it(
      'runs extraction and returns deterministic code-owned claim identities',
      async () => {
        const executor =
          vi.fn<
            FlashSemanticTextExecutor
          >(
            async () =>
              JSON.stringify({
                claims: [
                  {
                    sourceField:
                      'title',

                    evidenceText:
                      'FDA a autorizat noul dispozitiv.',
                  },
                  {
                    sourceField:
                      'body',

                    evidenceText:
                      'Studiul a inclus 500 de participanți.',
                  },
                ],
              }),
          )

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'generation-run-1',
            },
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        if (!result.ok) {
          throw new Error(
            'expected extraction success',
          )
        }

        expect(
          result.run,
        ).toEqual({
          stage:
            'factualClaimExtraction',

          method:
            'model',

          runId:
            'generation-run-1',

          provider:
            'test-provider',

          model:
            'test-model',
        })

        expect(
          result.extraction.claims,
        ).toHaveLength(
          2,
        )

        expect(
          result.extraction.claims[0]
            ?.id,
        ).toMatch(
          /^claim:[a-f0-9]{64}$/,
        )

        expect(
          result.extraction.claimCandidates,
        ).toEqual(
          result.extraction.claims.map(
            claim => ({
              id:
                claim.id,

              text:
                claim.text,
            }),
          ),
        )

        expect(
          executor,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          executor,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            runId:
              'generation-run-1',
          }),
        )
      },
    )

    it(
      'accepts a valid empty claim set',
      async () => {
        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                async () =>
                  '{"claims":[]}',
              ),

            input: {
              document:
                document(),

              runId:
                'generation-empty',
            },
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        if (!result.ok) {
          throw new Error(
            'expected empty extraction success',
          )
        }

        expect(
          result.extraction,
        ).toEqual({
          claims:
            [],

          claimCandidates:
            [],
        })
      },
    )

    it(
      'returns invalid_output for malformed or fenced model output',
      async () => {
        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                async () =>
                  '```json\n{"claims":[]}\n```',
              ),

            input: {
              document:
                document(),

              runId:
                'generation-invalid-json',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          extraction:
            null,

          reason:
            'invalid_output',
        })
      },
    )

    it(
      'returns invalid_output when model evidence is not anchored in the declared field',
      async () => {
        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                async () =>
                  JSON.stringify({
                    claims: [
                      {
                        sourceField:
                          'title',

                        evidenceText:
                          'Studiul a inclus 500 de participanți.',
                      },
                    ],
                  }),
              ),

            input: {
              document:
                document(),

              runId:
                'generation-unanchored',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          extraction:
            null,

          reason:
            'invalid_output',
        })
      },
    )

    it(
      'returns configuration_error for a blank provider without calling the executor',
      async () => {
        const executor =
          vi.fn<
            FlashSemanticTextExecutor
          >(
            async () =>
              '{"claims":[]}',
          )

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                executor,
                {
                  provider:
                    '   ',
                },
              ),

            input: {
              document:
                document(),

              runId:
                'generation-provider-config',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          reason:
            'configuration_error',
        })

        expect(
          executor,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'returns configuration_error for a blank model without calling the executor',
      async () => {
        const executor =
          vi.fn<
            FlashSemanticTextExecutor
          >(
            async () =>
              '{"claims":[]}',
          )

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                executor,
                {
                  model:
                    '   ',
                },
              ),

            input: {
              document:
                document(),

              runId:
                'generation-model-config',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          reason:
            'configuration_error',
        })

        expect(
          executor,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'preserves provider_error from the injected executor',
      async () => {
        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                async () => {
                  throw new FlashSemanticEvidenceProducerError(
                    'provider_error',
                  )
                },
              ),

            input: {
              document:
                document(),

              runId:
                'generation-provider-error',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          extraction:
            null,

          reason:
            'provider_error',
        })
      },
    )

    it(
      'converts unexpected executor failures to execution_error',
      async () => {
        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                async () => {
                  throw new Error(
                    'unexpected',
                  )
                },
              ),

            input: {
              document:
                document(),

              runId:
                'generation-execution-error',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          extraction:
            null,

          reason:
            'execution_error',
        })
      },
    )

    it(
      'rejects a blank runId before executing the model',
      async () => {
        const executor =
          vi.fn<
            FlashSemanticTextExecutor
          >(
            async () =>
              '{"claims":[]}',
          )

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                '   ',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          extraction:
            null,

          reason:
            'invalid_input',

          run: {
            runId:
              '',
          },
        })

        expect(
          executor,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
