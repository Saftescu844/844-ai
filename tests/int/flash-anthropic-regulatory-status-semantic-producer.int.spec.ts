import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashRegulatoryStatusDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/regulatoryStatusDecisionAdapter'

import {
  createAnthropicFlashRegulatoryStatusSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicRegulatoryStatusSemanticProducer'

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
      'Compania anunță lansarea unui nou sistem medical',

    excerpt:
      'Produsul este evaluat pentru utilizare clinică.',

    bodyText:
      [
        'Compania a prezentat noi rezultate clinice.',
        '',
        'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
      ].join('\n'),

    metadata: {
      flashType:
        'product',

      informationStatus:
        'confirmed',

      riskLevel:
        'low',

      isHealthRelated:
        true,

      medicalEvidenceType:
        'productOrCompanyClaim',

      clinicalValidationStatus:
        'authorizedOrApproved',
    },
  }
}

function irrelevantOutput() {
  return {
    regulatoryContextRelevant:
      false,

    findings:
      [],
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
  'Anthropic Flash regulatory status semantic producer wiring',
  () => {
    it(
      'composes Anthropic with the Regulatory producer without making a request at creation time',
      () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify(
              irrelevantOutput(),
            ),
          )

        const producer =
          createAnthropicFlashRegulatoryStatusSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          kind:
            'regulatoryStatus',

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
      'runs the complete Anthropic-to-Regulatory evidence path',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify(
              irrelevantOutput(),
            ),
          )

        const producer =
          createAnthropicFlashRegulatoryStatusSemanticProducer({
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
                'anthropic-regulatory-1',
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
            'regulatoryStatus',

          method:
            'model',

          provider:
            'anthropic',

          model:
            'claude-test-model',

          runId:
            'anthropic-regulatory-1',
        })

        expect(
          result.evidence,
        ).toEqual({
          regulatoryContextRelevant:
            false,

          findings:
            [],
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
      'preserves anchored clear regulatory evidence through the Anthropic path',
      async () => {
        const {
          client,
        } =
          mockAnthropicClient(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
                },
              ],
            }),
          )

        const producer =
          createAnthropicFlashRegulatoryStatusSemanticProducer({
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
                'anthropic-regulatory-2',
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
          buildFlashRegulatoryStatusDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            false,
        })

        expect(
          decisionEvidence
            .regulatoryStatusEvidence
            .evaluatedFindings[0],
        ).toMatchObject({
          evidencePresent:
            true,

          clearAndSupported:
            true,

          reviewRequired:
            false,
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
          createAnthropicFlashRegulatoryStatusSemanticProducer({
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
                'anthropic-regulatory-3',
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
              irrelevantOutput(),
            ),
          )

        const producer =
          createAnthropicFlashRegulatoryStatusSemanticProducer({
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
              'anthropic-regulatory-4',
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
