import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashMedicalInterpretationDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/medicalInterpretationDecisionAdapter'

import {
  createAnthropicFlashMedicalInterpretationSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicMedicalInterpretationSemanticProducer'

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
      'Studiu clinic nou',

    excerpt:
      'Material medical pentru informare.',

    bodyText:
      [
        'Studiul a inclus 500 de participanți.',
        '',
        'Rezultatul poate avea relevanță clinică pentru pacienții cu boala X.',
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
        'medical-clinical-significance',

      type:
        'clinicalSignificance',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'medical-patient-applicability',

      type:
        'patientApplicability',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'medical-comparative-clinical-claim',

      type:
        'comparativeClinicalClaim',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'medical-benefit-risk',

      type:
        'benefitRiskInterpretation',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'medical-clinical-decision',

      type:
        'clinicalDecisionImplication',

      verdict:
        'absent',

      evidenceText:
        null,
    },
    {
      id:
        'medical-other-interpretation',

      type:
        'otherMedicalInterpretation',

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
  'Anthropic Flash medical interpretation semantic producer wiring',
  () => {
    it(
      'composes Anthropic with the Medical producer without making a request at creation time',
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
          createAnthropicFlashMedicalInterpretationSemanticProducer({
            client,

            model:
              'claude-test-model',
          })

        expect(
          producer.descriptor,
        ).toEqual({
          kind:
            'medicalInterpretation',

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
      'runs the complete Anthropic-to-Medical evidence path',
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
          createAnthropicFlashMedicalInterpretationSemanticProducer({
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
                'anthropic-medical-1',
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
            'medicalInterpretation',

          method:
            'model',

          provider:
            'anthropic',

          model:
            'claude-test-model',

          runId:
            'anthropic-medical-1',
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
      'preserves anchored medical interpretation through the Anthropic path',
      async () => {
        const findings =
          cleanFindings()

        findings[0] = {
          id:
            'medical-clinical-significance',

          type:
            'clinicalSignificance',

          verdict:
            'present',

          evidenceText:
            'relevanță clinică',
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
          createAnthropicFlashMedicalInterpretationSemanticProducer({
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
                'anthropic-medical-2',
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
          buildFlashMedicalInterpretationDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            true,
        })

        expect(
          decisionEvidence
            .medicalInterpretationEvidence
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
          createAnthropicFlashMedicalInterpretationSemanticProducer({
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
                'anthropic-medical-3',
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
          createAnthropicFlashMedicalInterpretationSemanticProducer({
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
              'anthropic-medical-4',
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
