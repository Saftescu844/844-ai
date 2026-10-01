import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashContradictions,
  type FlashContradictionCase,
} from '@/lib/flash/runtimeEvidence/contradictionEvidence'

function contradictionCase(
  overrides:
    Partial<FlashContradictionCase> = {},
): FlashContradictionCase {
  return {
    id: 'conflict-1',
    subjectId: 'claim-1',

    firstPosition: {
      citationId: 100,
      evidenceRef:
        'source-100#section-2',
    },

    secondPosition: {
      citationId: 200,
      evidenceRef:
        'source-200#section-4',
    },

    relation: 'materialConflict',
    comparable: true,
    material: true,

    ...overrides,
  }
}

describe(
  'Flash contradiction evidence',
  () => {
    it(
      'fără cazuri nu raportează contradicții',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [],
          })

        expect(result).toEqual({
          materialContradictions:
            false,
          articleDisclosureSuggested:
            false,
          evaluatedCases: [],
        })
      },
    )

    it(
      'confirmă un conflict material când ambele poziții au evidence comparabil',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase(),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(true)

        expect(
          result
            .articleDisclosureSuggested,
        ).toBe(true)

        expect(
          result.evaluatedCases[0]
            .materialConflictConfirmed,
        ).toBe(true)
      },
    )

    it(
      'o simplă contestare nu devine contradicție materială',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                relation:
                  'contestation',
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)

        expect(
          result
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it(
      'contestarea fără evidence poate fi marcată editorial fără a deveni conflict material',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                relation:
                  'contestation',

                secondPosition: {
                  citationId: 200,
                  evidenceRef: null,
                },
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)

        expect(
          result
            .articleDisclosureSuggested,
        ).toBe(true)

        expect(
          result.evaluatedCases[0]
            .secondEvidencePresent,
        ).toBe(false)
      },
    )

    it(
      'nu confirmă conflict material dacă prima poziție nu are evidence',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                firstPosition: {
                  citationId: 100,
                  evidenceRef: null,
                },
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)
      },
    )

    it(
      'nu confirmă conflict material dacă a doua poziție nu are evidence',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                secondPosition: {
                  citationId: 200,
                  evidenceRef: '   ',
                },
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)
      },
    )

    it(
      'nu confirmă conflict între poziții care nu sunt comparabile',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                comparable: false,
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)

        expect(
          result
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it(
      'nu confirmă conflict dacă diferența nu schimbă material concluzia',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                material: false,
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)
      },
    )

    it(
      'diferența de context nu este tratată drept contestație',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                relation:
                  'contextDifference',
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)

        expect(
          result
            .articleDisclosureSuggested,
        ).toBe(false)
      },
    )

    it(
      'informația mai nouă nu este automat contradicție cu informația veche',
      () => {
        const result =
          evaluateFlashContradictions({
            cases: [
              contradictionCase({
                relation:
                  'newerEvidence',
              }),
            ],
          })

        expect(
          result.materialContradictions,
        ).toBe(false)

        expect(
          result
            .articleDisclosureSuggested,
        ).toBe(false)
      },
    )
  },
)
