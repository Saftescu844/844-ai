import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashSafetyDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/safetyDecisionAdapter'

import {
  createAnthropicFlashSafetySemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicSafetySemanticProducer'

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
      'Flash despre siguranță',

    excerpt:
      'Material informativ pentru analiză.',

    bodyText:
      [
        'Context general.',
        '',
        'Instrucțiunea analizată este periculoasă.',
      ].join('\n'),

    metadata: {
      flashType:
        'research',

      informationStatus:
        'confirmed',

      riskLevel:
        'low',

      isHealthRelated:
        false,

      medicalEvidenceType:
        'notApplicable',

      clinicalValidationStatus:
        'notApplicable',
    },
  }
}

function safeFindings() {
  return [
    {
      id:
        'safety-general',

      type:
        'generalSafetyConcern',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'safety-individual-diagnosis',

      type:
        'individualDiagnosis',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'safety-individual-treatment',

      type:
        'individualTreatmentRecommendation',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'safety-medication-change',

      type:
        'medicationChange',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'safety-dangerous-instructions',

      type:
        'dangerousInstructions',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'safety-editorial-violation',

      type:
        'fundamentalEditorialViolation',

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
  'Anthropic Flash safety semantic producer wiring',
  () => {
    it(
      'composes Anthropic with the Safety producer without making a request at creation time',
      () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify({
              findings:
                safeFindings(),
            }),
          )

        const producer =
          createAnthropicFlashSafetySemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          kind:
            'safety',

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
      'runs the complete Anthropic-to-Safety evidence path',
      async () => {
        const {
          client,
          create,
        } =
          mockAnthropicClient(
            JSON.stringify({
              findings:
                safeFindings(),
            }),
          )

        const producer =
          createAnthropicFlashSafetySemanticProducer({
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
                'anthropic-safety-1',
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
            'safety',

          method:
            'model',

          provider:
            'anthropic',

          model:
            'claude-test-model',

          runId:
            'anthropic-safety-1',
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
      'preserves deterministic evidence anchoring through the Anthropic path',
      async () => {
        const findings =
          safeFindings()

        findings[4] = {
          id:
            'safety-dangerous-instructions',

          type:
            'dangerousInstructions',

          verdict:
            'present',

          evidenceText:
            'Instrucțiunea analizată este periculoasă.',
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
          createAnthropicFlashSafetySemanticProducer({
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
                'anthropic-safety-2',
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
          buildFlashSafetyDecisionEvidence(
            result.evidence,
          ).decisionEvidence

        expect(
          decisionEvidence,
        ).toMatchObject({
          safetyGateTriggered:
            false,

          dangerousInstructions:
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
          createAnthropicFlashSafetySemanticProducer({
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
                'anthropic-safety-3',
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
                safeFindings(),
            }),
          )

        const producer =
          createAnthropicFlashSafetySemanticProducer({
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
              'anthropic-safety-4',
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
