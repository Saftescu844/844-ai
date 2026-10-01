import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashMedicalInterpretationDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/medicalInterpretationDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  parseFlashMedicalInterpretationSemanticOutput,
  toFlashMedicalInterpretationEvidenceInput,
} from '@/lib/flash/semanticEvidence/medicalInterpretationSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
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
      'Rezultatele trebuie interpretate în context clinic.',

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

function expectInvalidOutput(
  raw:
    string,
) {
  try {
    parseFlashMedicalInterpretationSemanticOutput(
      raw,
    )
  } catch (error) {
    expect(
      error,
    ).toBeInstanceOf(
      FlashSemanticEvidenceProducerError,
    )

    expect(
      (
        error as
          FlashSemanticEvidenceProducerError
      ).reason,
    ).toBe(
      'invalid_output',
    )

    return
  }

  throw new Error(
    'Expected invalid_output',
  )
}

describe(
  'Flash medical interpretation semantic output',
  () => {
    it(
      'parses strict structured JSON',
      () => {
        const result =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'medical-1',

                  type:
                    'clinicalSignificance',

                  verdict:
                    'present',

                  evidenceText:
                    'relevanță clinică',
                },
              ],
            }),
          )

        expect(
          result,
        ).toEqual({
          findings: [
            {
              id:
                'medical-1',

              type:
                'clinicalSignificance',

              verdict:
                'present',

              evidenceText:
                'relevanță clinică',
            },
          ],
        })
      },
    )

    it(
      'rejects fenced non-JSON output',
      () => {
        expectInvalidOutput(
          [
            '```json',
            '{"findings":[]}',
            '```',
          ].join('\n'),
        )
      },
    )

    it(
      'rejects unexpected root fields',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings:
              [],

            decision:
              'review',
          }),
        )
      },
    )

    it(
      'rejects unknown interpretation types',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [
              {
                id:
                  'medical-1',

                type:
                  'genericMedicalText',

                verdict:
                  'present',

                evidenceText:
                  null,
              },
            ],
          }),
        )
      },
    )

    it(
      'rejects unknown verdicts',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [
              {
                id:
                  'medical-1',

                type:
                  'clinicalSignificance',

                verdict:
                  'review',

                evidenceText:
                  null,
              },
            ],
          }),
        )
      },
    )

    it(
      'rejects duplicate finding ids',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [
              {
                id:
                  'same-id',

                type:
                  'clinicalSignificance',

                verdict:
                  'present',

                evidenceText:
                  null,
              },
              {
                id:
                  'same-id',

                type:
                  'patientApplicability',

                verdict:
                  'uncertain',

                evidenceText:
                  null,
              },
            ],
          }),
        )
      },
    )

    it(
      'anchors exact evidence deterministically',
      () => {
        const output =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'medical-1',

                  type:
                    'clinicalSignificance',

                  verdict:
                    'present',

                  evidenceText:
                    'relevanță clinică',
                },
              ],
            }),
          )

        const adapted =
          toFlashMedicalInterpretationEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          adapted
            .findings[0]
            .evidenceRef,
        ).toMatch(
          /^body:\d+-\d+$/,
        )
      },
    )

    it(
      'does not anchor invented evidence text',
      () => {
        const output =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'medical-1',

                  type:
                    'clinicalSignificance',

                  verdict:
                    'present',

                  evidenceText:
                    'Fragment inventat de model.',
                },
              ],
            }),
          )

        const adapted =
          toFlashMedicalInterpretationEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          adapted
            .findings[0]
            .evidenceRef,
        ).toBeNull()
      },
    )

    it(
      'never anchors an absent finding',
      () => {
        const output =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'medical-1',

                  type:
                    'clinicalSignificance',

                  verdict:
                    'absent',

                  evidenceText:
                    'relevanță clinică',
                },
              ],
            }),
          )

        const adapted =
          toFlashMedicalInterpretationEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          adapted
            .findings[0]
            .evidenceRef,
        ).toBeNull()
      },
    )

    it(
      'confirmed medical interpretation reaches REVIEW evidence',
      () => {
        const output =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'medical-1',

                  type:
                    'patientApplicability',

                  verdict:
                    'present',

                  evidenceText:
                    'pacienții cu boala X',
                },
              ],
            }),
          )

        const adapted =
          toFlashMedicalInterpretationEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashMedicalInterpretationDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            true,
        })

        expect(
          result
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
      'unanchored present interpretation remains conservative REVIEW without being confirmed',
      () => {
        const output =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'medical-1',

                  type:
                    'benefitRiskInterpretation',

                  verdict:
                    'present',

                  evidenceText:
                    'Fragment care nu există.',
                },
              ],
            }),
          )

        const adapted =
          toFlashMedicalInterpretationEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashMedicalInterpretationDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            true,
        })

        expect(
          result
            .medicalInterpretationEvidence
            .evaluatedFindings[0],
        ).toMatchObject({
          confirmed:
            false,

          reviewRequired:
            true,
        })
      },
    )

    it(
      'does not infer medical interpretation merely from health metadata',
      () => {
        const output =
          parseFlashMedicalInterpretationSemanticOutput(
            JSON.stringify({
              findings:
                [],
            }),
          )

        const adapted =
          toFlashMedicalInterpretationEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashMedicalInterpretationDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            false,
        })
      },
    )
  },
)
