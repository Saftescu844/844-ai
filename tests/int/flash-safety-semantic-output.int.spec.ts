import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashSafetyDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/safetyDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  parseFlashSafetySemanticOutput,
  toFlashSafetyEvidenceInput,
} from '@/lib/flash/semanticEvidence/safetySemanticOutput'

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
      'Flash despre siguranță',

    excerpt:
      'Un rezumat pentru analiză.',

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

function expectInvalidOutput(
  raw:
    string,
) {
  try {
    parseFlashSafetySemanticOutput(
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
  'Flash safety semantic output',
  () => {
    it(
      'parses strict structured JSON',
      () => {
        const result =
          parseFlashSafetySemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'safety-1',

                  type:
                    'generalSafetyConcern',

                  verdict:
                    'present',

                  evidenceText:
                    'Context general.',
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
                'safety-1',

              type:
                'generalSafetyConcern',

              verdict:
                'present',

              evidenceText:
                'Context general.',
            },
          ],
        })
      },
    )

    it(
      'rejects non-JSON fenced output',
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
      'rejects unexpected fields',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [],
            decision:
              'autoPublish',
          }),
        )
      },
    )

    it(
      'rejects an unknown safety type',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [
              {
                id:
                  'safety-1',

                type:
                  'unknownSafetyType',

                verdict:
                  'present',
              },
            ],
          }),
        )
      },
    )

    it(
      'rejects an unknown verdict',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            findings: [
              {
                id:
                  'safety-1',

                type:
                  'dangerousInstructions',

                verdict:
                  'blocked',
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
                  'generalSafetyConcern',

                verdict:
                  'present',
              },
              {
                id:
                  'same-id',

                type:
                  'dangerousInstructions',

                verdict:
                  'uncertain',
              },
            ],
          }),
        )
      },
    )

    it(
      'anchors exact evidence deterministically in the semantic document',
      () => {
        const output =
          parseFlashSafetySemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'safety-1',

                  type:
                    'dangerousInstructions',

                  verdict:
                    'present',

                  evidenceText:
                    'Instrucțiunea analizată este periculoasă.',
                },
              ],
            }),
          )

        const evidence =
          toFlashSafetyEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          evidence
            .findings[0]
            .evidenceRef,
        ).toMatch(
          /^body:\d+-\d+$/,
        )
      },
    )

    it(
      'does not anchor evidence text absent from the document',
      () => {
        const output =
          parseFlashSafetySemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'safety-1',

                  type:
                    'dangerousInstructions',

                  verdict:
                    'present',

                  evidenceText:
                    'Fragment inventat de model.',
                },
              ],
            }),
          )

        const evidence =
          toFlashSafetyEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          evidence
            .findings[0]
            .evidenceRef,
        ).toBeNull()
      },
    )

    it(
      'never anchors an absent finding',
      () => {
        const output =
          parseFlashSafetySemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'safety-1',

                  type:
                    'dangerousInstructions',

                  verdict:
                    'absent',

                  evidenceText:
                    'Instrucțiunea analizată este periculoasă.',
                },
              ],
            }),
          )

        const evidence =
          toFlashSafetyEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          evidence
            .findings[0]
            .evidenceRef,
        ).toBeNull()
      },
    )

    it(
      'allows an anchored dangerous finding to reach the deterministic BLOCK gate',
      () => {
        const output =
          parseFlashSafetySemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'safety-1',

                  type:
                    'dangerousInstructions',

                  verdict:
                    'present',

                  evidenceText:
                    'Instrucțiunea analizată este periculoasă.',
                },
              ],
            }),
          )

        const adapted =
          toFlashSafetyEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashSafetyDecisionEvidence(
            adapted,
          )

        expect(
          result.decisionEvidence,
        ).toMatchObject({
          safetyGateTriggered:
            false,

          dangerousInstructions:
            true,
        })
      },
    )

    it(
      'downgrades an unanchored present BLOCK finding to REVIEW evidence',
      () => {
        const output =
          parseFlashSafetySemanticOutput(
            JSON.stringify({
              findings: [
                {
                  id:
                    'safety-1',

                  type:
                    'dangerousInstructions',

                  verdict:
                    'present',

                  evidenceText:
                    'Fragment care nu există.',
                },
              ],
            }),
          )

        const adapted =
          toFlashSafetyEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashSafetyDecisionEvidence(
            adapted,
          )

        expect(
          result.decisionEvidence,
        ).toMatchObject({
          safetyGateTriggered:
            true,

          dangerousInstructions:
            false,
        })
      },
    )
  },
)
