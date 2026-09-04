import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashMedicalInterpretation,
  type FlashMedicalInterpretationFinding,
} from '@/lib/flash/runtimeEvidence/medicalInterpretationEvidence'

function finding(
  overrides:
    Partial<FlashMedicalInterpretationFinding> = {},
): FlashMedicalInterpretationFinding {
  return {
    id: 'medical-1',
    type:
      'clinicalSignificance',
    verdict: 'absent',
    evidenceRef:
      'paragraph:1',
    ...overrides,
  }
}

describe(
  'Flash medical interpretation runtime evidence',
  () => {
    it(
      'returns clean evidence when there are no findings',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [],
          })

        expect(result)
          .toEqual({
            importantMedicalInterpretation:
              false,

            reasons: [],

            evaluatedFindings:
              [],
          })
      },
    )

    it(
      'absent finding does not require review',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding(),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(false)

        expect(
          result
            .evaluatedFindings[0],
        ).toMatchObject({
          verdict: 'absent',
          confirmed: false,
          reviewRequired:
            false,
        })
      },
    )

    it(
      'present finding with evidence confirms important medical interpretation',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding({
                verdict:
                  'present',
                evidenceRef:
                  'claim:clinical-1',
              }),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(
          'important_medical_interpretation_confirmed',
        )

        expect(
          result
            .evaluatedFindings[0],
        ).toMatchObject({
          evidencePresent:
            true,
          confirmed: true,
          reviewRequired:
            true,
        })
      },
    )

    it(
      'present finding without evidence still requires review but is not confirmed',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding({
                verdict:
                  'present',
                evidenceRef:
                  '   ',
              }),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'present_interpretation_without_evidence',
        )
      },
    )

    it(
      'uncertain finding requires review without being confirmed',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding({
                verdict:
                  'uncertain',
              }),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'uncertain_medical_interpretation',
        )
      },
    )

    it.each([
      'clinicalSignificance',
      'patientApplicability',
      'comparativeClinicalClaim',
      'benefitRiskInterpretation',
      'clinicalDecisionImplication',
      'otherMedicalInterpretation',
    ] as const)(
      '%s can independently require medical review',
      (type) => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding({
                type,
                verdict:
                  'present',
                evidenceRef:
                  `claim:${type}`,
              }),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(true)
      },
    )

    it(
      'one relevant finding is enough when other findings are absent',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding({
                id: 'absent-1',
              }),

              finding({
                id: 'present-1',
                type:
                  'patientApplicability',
                verdict:
                  'present',
                evidenceRef:
                  'paragraph:8',
              }),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings,
        ).toHaveLength(2)
      },
    )

    it(
      'does not infer interpretation from medical wording when verdict is absent',
      () => {
        const result =
          evaluateFlashMedicalInterpretation({
            findings: [
              finding({
                type:
                  'clinicalDecisionImplication',
                verdict:
                  'absent',
                evidenceRef:
                  'text discusses treatment, diagnosis and clinical decisions',
              }),
            ],
          })

        expect(
          result
            .importantMedicalInterpretation,
        ).toBe(false)

        expect(
          result.reasons,
        ).toEqual([])
      },
    )
  },
)
