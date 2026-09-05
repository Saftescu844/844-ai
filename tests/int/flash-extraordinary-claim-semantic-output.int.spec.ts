import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashExtraordinaryClaimDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/extraordinaryClaimDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  parseFlashExtraordinaryClaimSemanticOutput,
  toFlashExtraordinaryClaimEvidenceInput,
} from '@/lib/flash/semanticEvidence/extraordinaryClaimSemanticOutput'

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

function expectInvalidOutput(
  raw:
    string,
) {
  try {
    parseFlashExtraordinaryClaimSemanticOutput(
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
  'Flash extraordinary claim semantic output',
  () => {
    it(
      'parses strict structured JSON',
      () => {
        const result =
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'extraordinary-1',

                  type:
                    'breakthroughOrCureClaim',

                  verdict:
                    'present',

                  evidenceText:
                    'vindecă toate cazurile fără excepție',
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
                'extraordinary-1',

              type:
                'breakthroughOrCureClaim',

              verdict:
                'present',

              evidenceText:
                'vindecă toate cazurile fără excepție',
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
      'rejects unknown extraordinary claim types',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [
              {
                id:
                  'extraordinary-1',

                type:
                  'sensationalLanguage',

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
                  'extraordinary-1',

                type:
                  'breakthroughOrCureClaim',

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
                  'breakthroughOrCureClaim',

                verdict:
                  'present',

                evidenceText:
                  null,
              },
              {
                id:
                  'same-id',

                type:
                  'nearPerfectPerformance',

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
      'anchors exact extraordinary evidence deterministically',
      () => {
        const output =
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'extraordinary-1',

                  type:
                    'broadOrUniversalEffect',

                  verdict:
                    'present',

                  evidenceText:
                    'vindecă toate cazurile fără excepție',
                },
              ],
            }),
          )

        const adapted =
          toFlashExtraordinaryClaimEvidenceInput({
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
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'extraordinary-1',

                  type:
                    'unprecedentedCapability',

                  verdict:
                    'present',

                  evidenceText:
                    'Fragment inventat de model.',
                },
              ],
            }),
          )

        const adapted =
          toFlashExtraordinaryClaimEvidenceInput({
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
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'extraordinary-1',

                  type:
                    'breakthroughOrCureClaim',

                  verdict:
                    'absent',

                  evidenceText:
                    'vindecă toate cazurile fără excepție',
                },
              ],
            }),
          )

        const adapted =
          toFlashExtraordinaryClaimEvidenceInput({
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
      'confirmed extraordinary wording reaches REVIEW evidence',
      () => {
        const output =
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'extraordinary-1',

                  type:
                    'breakthroughOrCureClaim',

                  verdict:
                    'present',

                  evidenceText:
                    'vindecă toate cazurile fără excepție',
                },
              ],
            }),
          )

        const adapted =
          toFlashExtraordinaryClaimEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashExtraordinaryClaimDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            true,
        })

        expect(
          result
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
      'unanchored present claim remains conservative REVIEW without confirmation',
      () => {
        const output =
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'extraordinary-1',

                  type:
                    'unprecedentedCapability',

                  verdict:
                    'present',

                  evidenceText:
                    'Fragment care nu există.',
                },
              ],
            }),
          )

        const adapted =
          toFlashExtraordinaryClaimEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashExtraordinaryClaimDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            true,
        })

        expect(
          result
            .extraordinaryClaimEvidence
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
      'does not infer extraordinary status from sensational document wording alone',
      () => {
        const output =
          parseFlashExtraordinaryClaimSemanticOutput(
            JSON.stringify({
              findings:
                [],
            }),
          )

        const adapted =
          toFlashExtraordinaryClaimEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashExtraordinaryClaimDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            false,
        })
      },
    )
  },
)
