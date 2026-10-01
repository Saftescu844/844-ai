import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashRegulatoryStatus,
  type FlashRegulatoryStatusFinding,
} from '@/lib/flash/runtimeEvidence/regulatoryStatusEvidence'

function finding(
  overrides:
    Partial<FlashRegulatoryStatusFinding> = {},
): FlashRegulatoryStatusFinding {
  return {
    id: 'regulatory-1',
    type:
      'approvalOrAuthorization',
    verdict: 'clear',
    evidenceRef:
      'regulator-document:1',
    ...overrides,
  }
}

describe(
  'Flash regulatory status runtime evidence',
  () => {
    it(
      'does not require review when regulatory context is not relevant',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              false,
            findings: [],
          })

        expect(result)
          .toEqual({
            regulatoryStatusUnclear:
              false,

            reasons: [],

            evaluatedFindings:
              [],
          })
      },
    )

    it(
      'requires review when regulatory context is relevant but no status evidence exists',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(
          'regulatory_context_without_status_evidence',
        )
      },
    )

    it(
      'clear regulatory status with evidence does not require review',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [
              finding(),
            ],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(false)

        expect(
          result
            .evaluatedFindings[0],
        ).toMatchObject({
          evidencePresent:
            true,
          clearAndSupported:
            true,
          reviewRequired:
            false,
        })
      },
    )

    it(
      'clear regulatory status without evidence requires review',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [
              finding({
                evidenceRef:
                  '   ',
              }),
            ],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings[0]
            .clearAndSupported,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'clear_regulatory_status_without_evidence',
        )
      },
    )

    it(
      'unclear regulatory status requires review',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [
              finding({
                verdict:
                  'unclear',
              }),
            ],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(
          'regulatory_status_unclear',
        )
      },
    )

    it(
      'conflicting regulatory status requires review',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [
              finding({
                verdict:
                  'conflicting',
              }),
            ],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(true)

        expect(
          result.reasons,
        ).toContain(
          'regulatory_status_conflicting',
        )
      },
    )

    it.each([
      'approvalOrAuthorization',
      'jurisdictionApplicability',
      'approvedIndicationOrUse',
      'researchUseOnly',
      'marketAvailability',
      'regulatoryChangeOrTransition',
      'otherRegulatoryStatus',
    ] as const)(
      '%s can be clear when supported by concrete evidence',
      (type) => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [
              finding({
                type,
                verdict:
                  'clear',
                evidenceRef:
                  `regulator:${type}`,
              }),
            ],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(false)

        expect(
          result
            .evaluatedFindings[0]
            .clearAndSupported,
        ).toBe(true)
      },
    )

    it(
      'one unclear finding is enough even when another regulatory finding is clear',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              true,
            findings: [
              finding({
                id: 'clear-1',
              }),

              finding({
                id: 'unclear-1',
                type:
                  'jurisdictionApplicability',
                verdict:
                  'unclear',
                evidenceRef:
                  'regulator:jurisdiction',
              }),
            ],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(true)

        expect(
          result
            .evaluatedFindings,
        ).toHaveLength(2)
      },
    )

    it(
      'does not infer regulatory uncertainty from clinical or medical wording',
      () => {
        const result =
          evaluateFlashRegulatoryStatus({
            regulatoryContextRelevant:
              false,

            findings: [],
          })

        expect(
          result
            .regulatoryStatusUnclear,
        ).toBe(false)

        expect(
          result.reasons,
        ).toEqual([])
      },
    )
  },
)
