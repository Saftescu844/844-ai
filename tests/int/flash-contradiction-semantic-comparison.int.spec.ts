import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashContradictions,
} from '@/lib/flash/runtimeEvidence/contradictionEvidence'

import {
  parseFlashContradictionSemanticOutput,
  toFlashContradictionEvidenceInput,
  type FlashContradictionSemanticCandidate,
} from '@/lib/flash/semanticEvidence/contradictionSemanticComparison'

import {
  FlashSemanticEvidenceProducerError,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

function candidate(
  overrides:
    Partial<
      FlashContradictionSemanticCandidate
    > = {},
): FlashContradictionSemanticCandidate {
  return {
    id:
      'contradiction-case-1',

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

    ...overrides,
  }
}

function expectInvalidOutput(
  fn:
    () => unknown,
) {
  try {
    fn()
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
  'Flash contradiction semantic comparison contract',
  () => {
    it(
      'parses a strict semantic comparison result',
      () => {
        const result =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction-case-1',

                  relation:
                    'materialConflict',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        expect(
          result,
        ).toEqual({
          cases: [
            {
              id:
                'contradiction-case-1',

              relation:
                'materialConflict',

              comparable:
                true,

              material:
                true,
            },
          ],
        })
      },
    )

    it(
      'rejects fenced output',
      () => {
        expectInvalidOutput(
          () =>
            parseFlashContradictionSemanticOutput(
              '```json\n{"cases":[]}\n```',
            ),
        )
      },
    )

    it(
      'rejects unexpected fields that could let the model invent evidence',
      () => {
        expectInvalidOutput(
          () =>
            parseFlashContradictionSemanticOutput(
              JSON.stringify({
                cases: [
                  {
                    id:
                      'contradiction-case-1',

                    relation:
                      'materialConflict',

                    comparable:
                      true,

                    material:
                      true,

                    citationId:
                      999,
                  },
                ],
              }),
            ),
        )
      },
    )

    it(
      'rejects unknown contradiction relations',
      () => {
        expectInvalidOutput(
          () =>
            parseFlashContradictionSemanticOutput(
              JSON.stringify({
                cases: [
                  {
                    id:
                      'contradiction-case-1',

                    relation:
                      'contradiction',

                    comparable:
                      true,

                    material:
                      true,
                  },
                ],
              }),
            ),
        )
      },
    )

    it(
      'requires comparable and material to be booleans',
      () => {
        expectInvalidOutput(
          () =>
            parseFlashContradictionSemanticOutput(
              JSON.stringify({
                cases: [
                  {
                    id:
                      'contradiction-case-1',

                    relation:
                      'materialConflict',

                    comparable:
                      'yes',

                    material:
                      true,
                  },
                ],
              }),
            ),
        )
      },
    )

    it(
      'rejects duplicate output case ids',
      () => {
        expectInvalidOutput(
          () =>
            parseFlashContradictionSemanticOutput(
              JSON.stringify({
                cases: [
                  {
                    id:
                      'same-id',

                    relation:
                      'contestation',

                    comparable:
                      true,

                    material:
                      false,
                  },
                  {
                    id:
                      'same-id',

                    relation:
                      'materialConflict',

                    comparable:
                      true,

                    material:
                      true,
                  },
                ],
              }),
            ),
        )
      },
    )

    it(
      'requires exact candidate coverage',
      () => {
        const output =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases:
                [],
            }),
          )

        expectInvalidOutput(
          () =>
            toFlashContradictionEvidenceInput({
              candidates: [
                candidate(),
              ],

              output,
            }),
        )
      },
    )

    it(
      'rejects unknown semantic case ids instead of inventing positions',
      () => {
        const output =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases: [
                {
                  id:
                    'unknown-case',

                  relation:
                    'materialConflict',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        expectInvalidOutput(
          () =>
            toFlashContradictionEvidenceInput({
              candidates: [
                candidate(),
              ],

              output,
            }),
        )
      },
    )

    it(
      'maps citation ids and evidence refs only from the trusted candidate',
      () => {
        const sourceCandidate =
          candidate()

        const output =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases: [
                {
                  id:
                    sourceCandidate.id,

                  relation:
                    'materialConflict',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        const result =
          toFlashContradictionEvidenceInput({
            candidates: [
              sourceCandidate,
            ],

            output,
          })

        expect(
          result.cases[0],
        ).toEqual({
          id:
            'contradiction-case-1',

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
      },
    )

    it(
      'allows existing runtime to confirm a fully evidenced material conflict',
      () => {
        const output =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction-case-1',

                  relation:
                    'materialConflict',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        const input =
          toFlashContradictionEvidenceInput({
            candidates: [
              candidate(),
            ],

            output,
          })

        const evaluated =
          evaluateFlashContradictions(
            input,
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
      'keeps contestation distinct from material contradiction',
      () => {
        const output =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction-case-1',

                  relation:
                    'contestation',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        const input =
          toFlashContradictionEvidenceInput({
            candidates: [
              candidate(),
            ],

            output,
          })

        const evaluated =
          evaluateFlashContradictions(
            input,
          )

        expect(
          evaluated
            .materialContradictions,
        ).toBe(false)

        expect(
          evaluated
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it.each([
      'contextDifference',
      'newerEvidence',
    ] as const)(
      '%s remains distinct from material contradiction',
      (
        relation,
      ) => {
        const output =
          parseFlashContradictionSemanticOutput(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction-case-1',

                  relation,

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        const input =
          toFlashContradictionEvidenceInput({
            candidates: [
              candidate(),
            ],

            output,
          })

        const evaluated =
          evaluateFlashContradictions(
            input,
          )

        expect(
          evaluated
            .materialContradictions,
        ).toBe(false)

        expect(
          evaluated
            .articleDisclosureSuggested,
        ).toBe(false)
      },
    )
  },
)
