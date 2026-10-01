import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashExtraordinaryClaimDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/extraordinaryClaimDecisionAdapter'

import {
  createAnthropicFlashExtraordinaryClaimSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicExtraordinaryClaimSemanticProducer'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

function document():
  FlashSemanticDocument {
  return {
    flashId:
      1,

    language:
      'ro',

    title:
      'Compania anunță rezultate spectaculoase',

    excerpt:
      'Tehnologia este prezentată drept o schimbare majoră.',

    bodyText:
      [
        'Rezultatele provin dintr-un studiu preliminar.',
        '',
        'Compania afirmă că sistemul vindecă toate cazurile fără excepție.',
      ].join('\n'),

    metadata: {
      flashType:
        'research',

      informationStatus:
        'preliminary',

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

function cleanFindings() {
  return [
    {
      id:
        'extraordinary-breakthrough-cure',

      type:
        'breakthroughOrCureClaim',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'extraordinary-near-perfect-performance',

      type:
        'nearPerfectPerformance',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'extraordinary-broad-universal-effect',

      type:
        'broadOrUniversalEffect',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'extraordinary-replacement-established-practice',

      type:
        'replacementOfEstablishedPractice',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'extraordinary-unprecedented-capability',

      type:
        'unprecedentedCapability',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'extraordinary-other',

      type:
        'otherExtraordinaryClaim',

      verdict:
        'absent',

      evidenceText:
        null,
    },
  ]
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
  'Anthropic Flash extraordinary claim semantic producer wiring',
  () => {
    it(
      'composes Anthropic with the Extraordinary producer without making a request at creation time',
      () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify({
              findings:
                cleanFindings(),
            }),
          )

        const producer =
          createAnthropicFlashExtraordinaryClaimSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          kind:
            'extraordinaryClaim',

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
      'runs the complete Anthropic-to-Extraordinary evidence path',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify({
              findings:
                cleanFindings(),
            }),
          )

        const producer =
          createAnthropicFlashExtraordinaryClaimSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashSemanticEvidenceProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-extraordinary-1',
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
        ).toMatchObject({
          kind:
            'extraordinaryClaim',

          method:
            'model',

          provider:
            'anthropic',

          model:
            'claude-test-model',

          runId:
            'anthropic-extraordinary-1',
        })

        expect(
          result.evidence
            .findings,
        ).toHaveLength(
          6,
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
      'preserves anchored extraordinary evidence through the Anthropic path',
      async () => {
        const findings =
          cleanFindings()

        findings[0] = {
          id:
            'extraordinary-breakthrough-cure',

          type:
            'breakthroughOrCureClaim',

          verdict:
            'present',

          evidenceText:
            'vindecă toate cazurile fără excepție',
        }

        const {
          client,
        } =
          mockAnthropicClient(
            JSON.stringify({
              findings,
            }),
          )

        const producer =
          createAnthropicFlashExtraordinaryClaimSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashSemanticEvidenceProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-extraordinary-2',
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

        const decisionEvidence =
          buildFlashExtraordinaryClaimDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            true,
        })

        expect(
          decisionEvidence
            .extraordinaryClaimEvidence
            .evaluatedFindings[0],
        ).toMatchObject({
          confirmed:
            true,

          reviewRequired:
            true,
        })
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
          createAnthropicFlashExtraordinaryClaimSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await runFlashSemanticEvidenceProducer({
            producer,

            input: {
              document:
                document(),

              runId:
                'anthropic-extraordinary-3',
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
            JSON.stringify({
              findings:
                cleanFindings(),
            }),
          )

        const producer =
          createAnthropicFlashExtraordinaryClaimSemanticProducer({
            client,

            model:
              'claude-test-model',

            maxTokens:
              1500,

            temperature:
              0.1,
          })

        await runFlashSemanticEvidenceProducer({
          producer,

          input: {
            document:
              document(),

            runId:
              'anthropic-extraordinary-4',
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
  },
)
