import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashExtraordinaryClaims,
  type FlashExtraordinaryClaimFinding,
} from '@/lib/flash/runtimeEvidence/extraordinaryClaimEvidence'

function finding(
  overrides:
    Partial<FlashExtraordinaryClaimFinding> = {},
): FlashExtraordinaryClaimFinding {
  return {
    id: 'extraordinary-1',
    type:
      'breakthroughOrCureClaim',
    verdict: 'absent',
    evidenceRef:
      'paragraph:1',
    ...overrides,
  }
}

describe(
  'Flash extraordinary claim runtime evidence',
  () => {
    it(
      'returns clean evidence when there are no findings',
      () => {
        const result =
          evaluateFlashExtraordinaryClaims({
            findings: [],
          })

        expect(result)
          .toEqual({
            extraordinaryClaimNeedsReview:
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
          evaluateFlashExtraordinaryClaims({
            findings: [
              finding(),
            ],
          })

        expect(
          result
            .extraordinaryClaimNeedsReview,
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
      'present extraordinary claim with evidence requires review',
      () => {
        const result =
          evaluateFlashExtraordinaryClaims({
            findings: [
              finding({
                verdict:
                  'present',
                evidenceRef:
                  'claim:extraordinary-1',
              }),
            ],
          })

        expect(
          result
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(
          'extraordinary_claim_confirmed',
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
      'present claim without evidence still requires review but is not confirmed',
      () => {
        const result =
          evaluateFlashExtraordinaryClaims({
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
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'present_extraordinary_claim_without_evidence',
        )
      },
    )

    it(
      'uncertain extraordinary claim requires review without confirmation',
      () => {
        const result =
          evaluateFlashExtraordinaryClaims({
            findings: [
              finding({
                verdict:
                  'uncertain',
              }),
            ],
          })

        expect(
          result
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'uncertain_extraordinary_claim',
        )
      },
    )

    it.each([
      'breakthroughOrCureClaim',
      'nearPerfectPerformance',
      'broadOrUniversalEffect',
      'replacementOfEstablishedPractice',
      'unprecedentedCapability',
      'otherExtraordinaryClaim',
    ] as const)(
      '%s can independently require review',
      (type) => {
        const result =
          evaluateFlashExtraordinaryClaims({
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
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(true)
      },
    )

    it(
      'one extraordinary finding is enough when other findings are absent',
      () => {
        const result =
          evaluateFlashExtraordinaryClaims({
            findings: [
              finding({
                id: 'absent-1',
              }),

              finding({
                id: 'present-1',
                type:
                  'nearPerfectPerformance',
                verdict:
                  'present',
                evidenceRef:
                  'claim:performance-1',
              }),
            ],
          })

        expect(
          result
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings,
        ).toHaveLength(2)
      },
    )

    it(
      'does not infer extraordinary status from sensational wording when verdict is absent',
      () => {
        const result =
          evaluateFlashExtraordinaryClaims({
            findings: [
              finding({
                type:
                  'unprecedentedCapability',
                verdict:
                  'absent',
                evidenceRef:
                  'text says revolutionary breakthrough and unprecedented results',
              }),
            ],
          })

        expect(
          result
            .extraordinaryClaimNeedsReview,
        ).toBe(false)

        expect(
          result.reasons,
        ).toEqual([])
      },
    )
  },
)
