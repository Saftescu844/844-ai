import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashFactualSupport,
  type FlashFactualClaim,
} from '@/lib/flash/runtimeEvidence/factualSupportEvidence'

function claim(
  overrides:
    Partial<FlashFactualClaim> = {},
): FlashFactualClaim {
  return {
    id: 'claim-1',
    text:
      'Compania a lansat produsul în septembrie 2026.',
    citationIds: [100],
    supportStatus: 'supported',
    ...overrides,
  }
}

describe(
  'Flash runtime evidence - factual support',
  () => {
    it(
      'trece când toate afirmațiile sunt susținute și citate',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim(),
              claim({
                id: 'claim-2',
                citationIds: [101, 102],
              }),
            ],
          })

        expect(result).toMatchObject({
          factsSupportedBySources: true,
          fabricatedInformation: false,
          fabricatedCitations: false,
          reasons: [],
        })

        expect(
          result.claims.every(
            item => item.passed,
          ),
        ).toBe(true)
      },
    )

    it(
      'nu permite PASS când nu există afirmații factuale evaluate',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [],
          })

        expect(result).toEqual({
          factsSupportedBySources: false,
          fabricatedInformation: false,
          fabricatedCitations: false,
          reasons: ['no_claims'],
          claims: [],
        })
      },
    )

    it(
      'respinge o afirmație fără citare concretă',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                citationIds: [],
              }),
            ],
          })

        expect(
          result.factsSupportedBySources,
        ).toBe(false)

        expect(result.reasons)
          .toContain(
            'claim_without_citation',
          )
      },
    )

    it(
      'suportul parțial nu este suficient pentru AUTO',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                supportStatus: 'partial',
              }),
            ],
          })

        expect(
          result.factsSupportedBySources,
        ).toBe(false)

        expect(result.reasons)
          .toContain(
            'claim_partially_supported',
          )
      },
    )

    it(
      'afirmația nesusținută nu trece',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                supportStatus:
                  'unsupported',
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'claim_unsupported',
          )
      },
    )

    it(
      'afirmația neverificabilă nu trece',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                supportStatus:
                  'unverifiable',
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'claim_unverifiable',
          )
      },
    )

    it(
      'afirmația explicit contrazisă nu trece factual support',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                supportStatus:
                  'contradicted',
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'claim_contradicted',
          )
      },
    )

    it(
      'fabricația explicit constatată este semnalată separat',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                explicitlyFabricated:
                  true,
              }),
            ],
          })

        expect(
          result.factsSupportedBySources,
        ).toBe(false)

        expect(
          result.fabricatedInformation,
        ).toBe(true)

        expect(result.reasons)
          .toContain(
            'explicit_fabrication',
          )
      },
    )

    it(
      'citarea fabricată este semnalată separat',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                fabricatedCitation:
                  true,
              }),
            ],
          })

        expect(
          result.factsSupportedBySources,
        ).toBe(false)

        expect(
          result.fabricatedCitations,
        ).toBe(true)

        expect(result.reasons)
          .toContain(
            'fabricated_citation',
          )
      },
    )

    it(
      'lipsa suportului nu este tratată automat ca fabricație',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                supportStatus:
                  'unsupported',
              }),
            ],
          })

        expect(
          result.fabricatedInformation,
        ).toBe(false)

        expect(
          result.fabricatedCitations,
        ).toBe(false)
      },
    )

    it(
      'numără citările duplicate o singură dată',
      () => {
        const result =
          evaluateFlashFactualSupport({
            claims: [
              claim({
                citationIds: [
                  100,
                  100,
                  '100',
                  101,
                ],
              }),
            ],
          })

        expect(
          result.claims[0]
            .citationCount,
        ).toBe(2)

        expect(
          result.factsSupportedBySources,
        ).toBe(true)
      },
    )
  },
)
