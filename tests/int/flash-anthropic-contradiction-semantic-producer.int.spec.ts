import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  evaluateFlashContradictions,
} from '@/lib/flash/runtimeEvidence/contradictionEvidence'

import {
  createAnthropicFlashContradictionSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicContradictionSemanticProducer'

import type {
  FlashContradictionSemanticCandidate,
} from '@/lib/flash/semanticEvidence/contradictionSemanticComparison'

import {
  runFlashContradictionSemanticProducer,
} from '@/lib/flash/semanticEvidence/contradictionSemanticProducer'

function candidate():
  FlashContradictionSemanticCandidate {
  return {
    id:
      'contradiction:claim-1:100:200',

    subjectId:
      'claim-1',

    subjectText:
      'Tratamentul reduce mortalitatea.',

    firstPosition: {
      citationId:
        100,

      evidenceRef:
        'source-100:paragraph-4',

      evidenceText:
        'Studiul raportează o reducere semnificativă a mortalității.',
    },

    secondPosition: {
      citationId:
        200,

      evidenceRef:
        'source-200:paragraph-7',

      evidenceText:
        'Analiza nu a identificat o reducere a mortalității.',
    },
  }
}

function materialConflictOutput() {
  return {
    cases: [
      {
        id:
          'contradiction:claim-1:100:200',

        relation:
          'materialConflict',

        comparable:
          true,

        material:
          true,
      },
    ],
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

describe(
  'Anthropic Flash contradiction semantic producer wiring',
  () => {
    it(
      'composes Anthropic with the specialized contradiction producer without making a request at creation time',
      () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify(
              materialConflictOutput(),
            ),
          )

        const producer =
          createAnthropicFlashContradictionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          kind:
            'contradictions',

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
      'runs the complete Anthropic-to-Contradiction evidence path',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify(
              materialConflictOutput(),
            ),
          )

        const producer =
          createAnthropicFlashContradictionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashContradictionSemanticProducer({
            producer,

            input: {
              runId:
                'anthropic-contradiction-1',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.run,
        ).toEqual({
          kind:
            'contradictions',

          method:
            'model',

          runId:
            'anthropic-contradiction-1',

          provider:
            'anthropic',

          model:
            'claude-test-model',
        })

        expect(
          result.evidence
            .cases[0],
        ).toEqual({
          id:
            'contradiction:claim-1:100:200',

          subjectId:
            'claim-1',

          firstPosition: {
            citationId:
              100,

            evidenceRef:
              'source-100:paragraph-4',
          },

          secondPosition: {
            citationId:
              200,

            evidenceRef:
              'source-200:paragraph-7',
          },

          relation:
            'materialConflict',

          comparable:
            true,

          material:
            true,
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

          temperature:
            0,

          messages: [
            {
              role:
                'user',
            },
          ],
        })
      },
    )

    it(
      'preserves the material contradiction decision through the Anthropic path',
      async () => {
        const {
          client,
        } =
          mockAnthropicClient(
            JSON.stringify(
              materialConflictOutput(),
            ),
          )

        const producer =
          createAnthropicFlashContradictionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashContradictionSemanticProducer({
            producer,

            input: {
              runId:
                'anthropic-contradiction-2',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        const evaluated =
          evaluateFlashContradictions(
            result.evidence,
          )

        expect(
          evaluated
            .materialContradictions,
        ).toBe(true)

        expect(
          evaluated
            .evaluatedCases[0]
            .materialConflictConfirmed,
        ).toBe(true)
      },
    )

    it(
      'maps an Anthropic SDK failure to provider_error',
      async () => {
        const create =
          vi.fn(
            async () => {
              throw new Error(
                'Anthropic unavailable',
              )
            },
          )

        const client = {
          messages: {
            create,
          },
        } as unknown as Anthropic

        const producer =
          createAnthropicFlashContradictionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashContradictionSemanticProducer({
            producer,

            input: {
              runId:
                'anthropic-contradiction-3',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          evidence:
            null,

          reason:
            'provider_error',
        })
      },
    )

    it(
      'passes explicit Anthropic generation settings through the composition layer',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify(
              materialConflictOutput(),
            ),
          )

        const producer =
          createAnthropicFlashContradictionSemanticProducer({
            client,

            model:
              'claude-test-model',

            maxTokens:
              1500,

            temperature:
              0.1,
          })

        await runFlashContradictionSemanticProducer({
          producer,

          input: {
            runId:
              'anthropic-contradiction-4',

            candidateSetComplete:
              true,

            candidates: [
              candidate(),
            ],
          },
        })

        expect(
          create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens:
              1500,

            temperature:
              0.1,
          }),
        )
      },
    )

    it(
      'does not call Anthropic for a complete empty candidate set',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            '{"cases":[]}',
          )

        const producer =
          createAnthropicFlashContradictionSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashContradictionSemanticProducer({
            producer,

            input: {
              runId:
                'anthropic-contradiction-5',

              candidateSetComplete:
                true,

              candidates:
                [],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        expect(
          create,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
