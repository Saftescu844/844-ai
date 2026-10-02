import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createAnthropicFlashFactualVerificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicFactualVerificationSemanticProducer'

import type {
  FlashFactualSourceChunk,
} from '@/lib/flash/semanticEvidence/factualSourceChunks'

import {
  runFlashFactualVerificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/factualVerificationSemanticProducer'

function claims() {
  return [
    {
      id:
        'claim-1',

      text:
        'Studiul a inclus 500 de participanți.',
    },
  ]
}

function chunks():
  FlashFactualSourceChunk[] {
  return [
    {
      citationId:
        'source-row-1',

      chunkIndex:
        0,

      chunkId:
        'chunk-a',

      evidenceRef:
        'source-row-1:chunk:0:aaaa',

      evidenceText:
        'Studiul a inclus 500 de participanți.',
    },
    {
      citationId:
        'source-row-2',

      chunkIndex:
        0,

      chunkId:
        'chunk-b',

      evidenceRef:
        'source-row-2:chunk:0:bbbb',

      evidenceText:
        'Documentul nu menționează dimensiunea studiului.',
    },
  ]
}

function validOutput() {
  return JSON.stringify({
    claims: [
      {
        claimId:
          'claim-1',

        checks: [
          {
            chunkId:
              'chunk-a',

            chunkIndex:
              0,

            verdict:
              'supports',
          },
          {
            chunkId:
              'chunk-b',

            chunkIndex:
              0,

            verdict:
              'notFound',
          },
        ],
      },
    ],
  })
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

function producerInput() {
  return {
    runId:
      'verification-run-1',

    generationRunId:
      'generation-run-1',

    evidenceSetComplete:
      true,

    claims:
      claims(),

    chunks:
      chunks(),
  }
}

describe(
  'Anthropic Flash factual verification semantic producer wiring',
  () => {
    it(
      'composes Anthropic with factual verification without making a request at creation time',
      () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            validOutput(),
          )

        const producer =
          createAnthropicFlashFactualVerificationSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          stage:
            'factualVerification',

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
      'runs the complete Anthropic-to-factual-provenance path',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            validOutput(),
          )

        const producer =
          createAnthropicFlashFactualVerificationSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer,

            input:
              producerInput(),
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
            'factualVerification',

          method:
            'model',

          runId:
            'verification-run-1',

          generationRunId:
            'generation-run-1',

          provider:
            'anthropic',

          model:
            'claude-test-model',
        })

        expect(
          result.provenance
            .verifications[0],
        ).toMatchObject({
          claimId:
            'claim-1',

          supportStatus:
            'supported',

          method:
            'separateModelPass',

          generationRunId:
            'generation-run-1',

          verificationRunId:
            'verification-run-1',

          citationChecks: [
            {
              citationId:
                'source-row-1',

              verdict:
                'supports',

              evidenceRef:
                'source-row-1:chunk:0:aaaa',
            },
            {
              citationId:
                'source-row-2',

              verdict:
                'notFound',

              evidenceRef:
                'source-row-2:chunk:0:bbbb',
            },
          ],
        })

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
          'factual verification engine',
        )

        const userContent =
          create.mock.calls[0][0]
            .messages[0]
            ?.content

        expect(
          userContent,
        ).toContain(
          '"chunkId": "chunk-a"',
        )

        expect(
          userContent,
        ).not.toContain(
          '"citationId"',
        )

        expect(
          userContent,
        ).not.toContain(
          '"evidenceRef"',
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
            validOutput(),
          )

        const producer =
          createAnthropicFlashFactualVerificationSemanticProducer({
            client,

            model:
              'claude-test-model',

            maxTokens:
              999,

            temperature:
              0.1,
          })

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer,

            input:
              producerInput(),
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
            999,

          temperature:
            0.1,
        })
      },
    )

    it(
      'preserves invalid_output for fenced Anthropic text',
      async () => {
        const {
          client,
        } =
          mockAnthropicClient(
            `\`\`\`json
${validOutput()}
\`\`\``,
          )

        const producer =
          createAnthropicFlashFactualVerificationSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer,

            input:
              producerInput(),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
            null,

          reason:
            'invalid_output',
        })
      },
    )

    it(
      'fails closed when Anthropic omits required claim-by-chunk coverage',
      async () => {
        const {
          client,
        } =
          mockAnthropicClient(
            JSON.stringify({
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                  ],
                },
              ],
            }),
          )

        const producer =
          createAnthropicFlashFactualVerificationSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer,

            input:
              producerInput(),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
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
          createAnthropicFlashFactualVerificationSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer,

            input:
              producerInput(),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
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
