import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashSafety,
  type FlashSafetyFinding,
} from '@/lib/flash/runtimeEvidence/safetyEvidence'

function finding(
  overrides:
    Partial<FlashSafetyFinding> = {},
): FlashSafetyFinding {
  return {
    id: 'finding-1',
    type:
      'generalSafetyConcern',
    verdict: 'absent',
    evidenceRef:
      'paragraph:1',
    ...overrides,
  }
}

describe(
  'Flash safety runtime evidence',
  () => {
    it(
      'returns clean evidence when there are no findings',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [],
          })

        expect(result)
          .toEqual({
            safetyGateTriggered:
              false,

            individualDiagnosis:
              false,

            individualTreatmentRecommendation:
              false,

            medicationChange:
              false,

            dangerousInstructions:
              false,

            fundamentalEditorialViolation:
              false,

            reasons: [],
            evaluatedFindings:
              [],
          })
      },
    )

    it(
      'absent finding does not trigger review or block',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding(),
            ],
          })

        expect(
          result
            .safetyGateTriggered,
        ).toBe(false)

        expect(
          result
            .evaluatedFindings[0],
        ).toMatchObject({
          verdict: 'absent',
          blockConfirmed:
            false,
          reviewRequired:
            false,
        })
      },
    )

    it(
      'general safety concern triggers REVIEW evidence',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                verdict:
                  'present',
              }),
            ],
          })

        expect(
          result
            .safetyGateTriggered,
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(
          'general_safety_concern',
        )

        expect(
          result
            .evaluatedFindings[0]
            .blockConfirmed,
        ).toBe(false)
      },
    )

    it(
      'uncertain block-class finding triggers review but not block',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                type:
                  'medicationChange',
                verdict:
                  'uncertain',
              }),
            ],
          })

        expect(
          result
            .safetyGateTriggered,
        ).toBe(true)

        expect(
          result
            .medicationChange,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'uncertain_safety_finding',
        )
      },
    )

    it(
      'present block-class finding without evidence triggers review but not block',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                type:
                  'individualDiagnosis',
                verdict:
                  'present',
                evidenceRef:
                  '   ',
              }),
            ],
          })

        expect(
          result
            .safetyGateTriggered,
        ).toBe(true)

        expect(
          result
            .individualDiagnosis,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'present_finding_without_evidence',
        )
      },
    )

    it.each([
      {
        type:
          'individualDiagnosis',
        field:
          'individualDiagnosis',
        reason:
          'individual_diagnosis_confirmed',
      },
      {
        type:
          'individualTreatmentRecommendation',
        field:
          'individualTreatmentRecommendation',
        reason:
          'individual_treatment_recommendation_confirmed',
      },
      {
        type:
          'medicationChange',
        field:
          'medicationChange',
        reason:
          'medication_change_confirmed',
      },
      {
        type:
          'dangerousInstructions',
        field:
          'dangerousInstructions',
        reason:
          'dangerous_instructions_confirmed',
      },
      {
        type:
          'fundamentalEditorialViolation',
        field:
          'fundamentalEditorialViolation',
        reason:
          'fundamental_editorial_violation_confirmed',
      },
    ] as const)(
      '$type present + evidence confirms its BLOCK flag',
      ({
        type,
        field,
        reason,
      }) => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                type,
                verdict:
                  'present',
                evidenceRef:
                  'paragraph:7',
              }),
            ],
          })

        expect(
          result[field],
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(reason)

        expect(
          result
            .evaluatedFindings[0],
        ).toMatchObject({
          evidencePresent:
            true,
          blockConfirmed:
            true,
          reviewRequired:
            false,
        })
      },
    )

    it(
      'confirmed BLOCK does not need separate review safety flag',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                type:
                  'dangerousInstructions',
                verdict:
                  'present',
                evidenceRef:
                  'claim:danger-1',
              }),
            ],
          })

        expect(
          result
            .dangerousInstructions,
        ).toBe(true)

        expect(
          result
            .safetyGateTriggered,
        ).toBe(false)
      },
    )

    it(
      'can return review evidence and confirmed block evidence together',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                id:
                  'finding-review',
                type:
                  'generalSafetyConcern',
                verdict:
                  'present',
              }),
              finding({
                id:
                  'finding-block',
                type:
                  'medicationChange',
                verdict:
                  'present',
                evidenceRef:
                  'paragraph:4',
              }),
            ],
          })

        expect(
          result
            .safetyGateTriggered,
        ).toBe(true)

        expect(
          result
            .medicationChange,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings,
        ).toHaveLength(2)
      },
    )

    it(
      'does not infer medication change from text or keywords',
      () => {
        const result =
          evaluateFlashSafety({
            findings: [
              finding({
                type:
                  'medicationChange',
                verdict:
                  'absent',
                evidenceRef:
                  'text contains medication terminology',
              }),
            ],
          })

        expect(
          result
            .medicationChange,
        ).toBe(false)

        expect(
          result
            .safetyGateTriggered,
        ).toBe(false)
      },
    )
  },
)
