import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createAnthropicFlashFactualClaimExtractionSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicFactualClaimExtractionSemanticProducer'

import {
  runFlashFactualClaimExtractionSemanticProducer,
} from '@/lib/flash/semanticEvidence/factualClaimExtractionSemanticProducer'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

function document():
  FlashSemanticDocument {
  return {
    flashId:
      1,

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
  }
}

function mockAnthropicClient(
  raw:
    string,
) {
  const create =
    vi.fn(
      async () => ({
        id:
          'msg_test',

        type:
          'message',

        role:
          'assistant',

        model:
          'claude-test-model',

        stop_reason:
          'end_turn',

        stop_sequence:
          null,

        usage: {
          input_tokens:
            10,

          output_tokens:
            20,
        },

        content: [
          {
            type:
              'text',

            text:
              raw,

            citations:
              null,
          },
        ],
      }),
    )

  const client = {
    messages: {
      create,
    },
  } as unknown as Anthropic

  return {
    client,
    create,
  }
}

function mockFailingAnthropicClient() {
  const create =
    vi.fn(
      async () => {
        throw new Error(
          'network failure',
        )
      },
    )

  const client = {
    messages: {
      create,
    },
  } as unknown as Anthropic

  return {
    client,
    create,
  }
}

describe(
  'Anthropic Flash factual claim extraction semantic producer wiring',
  () => {
    it(
      'composes Anthropic with claim extraction without making a request at creation time',
      () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            '{"claims":[]}',
          )

        const producer =
          createAnthropicFlashFactualClaimExtractionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          stage:
            'factualClaimExtraction',

          method:
            'model',

          provider:
            'anthropic',

          model:
            'claude-test-model',
        })

        expect(
          create,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'runs the complete Anthropic-to-claim-extraction path',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
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

        const producer =
          createAnthropicFlashFactualClaimExtractionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-factual-claims-1',
            },
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.run,
        ).toEqual({
          stage:
            'factualClaimExtraction',

          method:
            'model',

          provider:
            'anthropic',

          model:
            'claude-test-model',

          runId:
            'anthropic-factual-claims-1',
        })

        expect(
          result.extraction.claims,
        ).toHaveLength(
          2,
        )

        expect(
          result.extraction.claims[0],
        ).toMatchObject({
          text:
            'FDA a autorizat noul dispozitiv.',

          sourceField:
            'title',

          sourceOffset:
            0,
        })

        expect(
          result.extraction.claims[0]
            ?.id,
        ).toMatch(
          /^claim:[a-f0-9]{64}$/,
        )

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          create.mock.calls[0][0],
        ).toMatchObject({
          model:
            'claude-test-model',

          max_tokens:
            2048,

          temperature:
            0,

          messages: [
            {
              role:
                'user',
            },
          ],
        })

        expect(
          create.mock.calls[0][0]
            .system,
        ).toContain(
          'factual-claim extractor',
        )

        expect(
          create.mock.calls[0][0]
            .messages[0]
            ?.content,
        ).toContain(
          '"bodyText": "Studiul a inclus 500 de participanți.',
        )
      },
    )

    it(
      'passes explicit Anthropic generation options through the shared executor',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            '{"claims":[]}',
          )

        const producer =
          createAnthropicFlashFactualClaimExtractionSemanticProducer({
            client,

            model:
              'claude-test-model',

            maxTokens:
              777,

            temperature:
              0.2,
          })

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-factual-options',
            },
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        expect(
          create.mock.calls[0][0],
        ).toMatchObject({
          max_tokens:
            777,

          temperature:
            0.2,
        })
      },
    )

    it(
      'preserves invalid_output for structurally invalid Anthropic text',
      async () => {
        const {
          client,
        } =
          mockAnthropicClient(
            '```json\n{"claims":[]}\n```',
          )

        const producer =
          createAnthropicFlashFactualClaimExtractionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-factual-invalid',
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
      'fails closed when Anthropic returns an unanchored factual claim',
      async () => {
        const {
          client,
        } =
          mockAnthropicClient(
            JSON.stringify({
              claims: [
                {
                  sourceField:
                    'title',

                  evidenceText:
                    'Acest text nu există în titlu.',
                },
              ],
            }),
          )

        const producer =
          createAnthropicFlashFactualClaimExtractionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-factual-unanchored',
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
      'maps an Anthropic request failure to provider_error',
      async () => {
        const {
          client,
          create,
        } =
          mockFailingAnthropicClient()

        const producer =
          createAnthropicFlashFactualClaimExtractionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualClaimExtractionSemanticProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-factual-provider-error',
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

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )
  },
)
