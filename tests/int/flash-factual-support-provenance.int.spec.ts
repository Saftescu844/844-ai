import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  validateFlashFactualProvenance,
  type FlashClaimCandidate,
  type FlashClaimVerification,
} from '@/lib/flash/runtimeEvidence/factualSupportProvenance'

function claim(
  overrides:
    Partial<FlashClaimCandidate> = {},
): FlashClaimCandidate {
  return {
    id: 'claim-1',
    text:
      'Compania a lansat produsul în septembrie 2026.',
    citationIds: [100],
    ...overrides,
  }
}

function verification(
  overrides:
    Partial<FlashClaimVerification> = {},
): FlashClaimVerification {
  return {
    claimId: 'claim-1',
    supportStatus: 'supported',
    method: 'separateModelPass',
    generationRunId: 'generation-1',
    verificationRunId: 'verification-1',
    citationChecks: [
      {
        citationId: 100,
        verdict: 'supports',
        evidenceRef:
          'source-100#section-2',
      },
    ],
    ...overrides,
  }
}

describe(
  'Flash factual support provenance',
  () => {
    it(
      'acceptă verificarea AI într-o rulare separată',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification(),
            ],
          })

        expect(result.valid)
          .toBe(true)

        expect(result.reasons)
          .toEqual([])

        expect(
          result.verifiedClaims[0],
        ).toMatchObject({
          id: 'claim-1',
          supportStatus: 'supported',
          explicitlyFabricated:
            false,
          fabricatedCitation:
            false,
        })
      },
    )

    it(
      'respinge auto-certificarea în aceeași rulare',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                verificationRunId:
                  'generation-1',
              }),
            ],
          })

        expect(result.valid)
          .toBe(false)

        expect(result.reasons)
          .toContain(
            'same_generation_and_verification_run',
          )
      },
    )

    it(
      'cere identificatori de rulare pentru verificarea AI',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                generationRunId: null,
                verificationRunId: null,
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'missing_verification_run',
          )
      },
    )

    it(
      'acceptă verificare umană fără run IDs',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                method: 'human',
                generationRunId: null,
                verificationRunId: null,
              }),
            ],
          })

        expect(result.valid)
          .toBe(true)
      },
    )

    it(
      'acceptă verificare deterministă fără run IDs',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                method:
                  'deterministic',
                generationRunId: null,
                verificationRunId: null,
              }),
            ],
          })

        expect(result.valid)
          .toBe(true)
      },
    )

    it(
      'respinge claim fără verificare',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [],
          })

        expect(result.reasons)
          .toContain(
            'missing_verification',
          )
      },
    )

    it(
      'respinge ID-uri duplicate de claim',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [
              claim(),
              claim(),
            ],
            verifications: [
              verification(),
            ],
          })

        expect(result.reasons)
          .toContain(
            'duplicate_claim_id',
          )
      },
    )

    it(
      'respinge verificări duplicate',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification(),
              verification(),
            ],
          })

        expect(result.reasons)
          .toContain(
            'duplicate_verification',
          )
      },
    )

    it(
      'respinge verificarea pentru un claim necunoscut',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                claimId:
                  'claim-necunoscut',
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'unknown_claim',
          )
      },
    )

    it(
      'respinge evidence pentru o citare nedeclarată de claim',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                citationChecks: [
                  {
                    citationId: 999,
                    verdict:
                      'supports',
                    evidenceRef:
                      'source-999#p1',
                  },
                ],
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'unknown_citation',
          )
      },
    )

    it(
      'cere locator concret pentru evidence',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                citationChecks: [
                  {
                    citationId: 100,
                    verdict:
                      'supports',
                    evidenceRef: '   ',
                  },
                ],
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'missing_evidence_ref',
          )
      },
    )

    it(
      'nu acceptă supported fără evidence care susține',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                citationChecks: [
                  {
                    citationId: 100,
                    verdict:
                      'notFound',
                    evidenceRef:
                      'source-100#checked',
                  },
                ],
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'supported_without_supporting_evidence',
          )
      },
    )

    it(
      'nu permite supported când există evidence contradictoriu',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                citationChecks: [
                  {
                    citationId: 100,
                    verdict:
                      'supports',
                    evidenceRef:
                      'source-100#p1',
                  },
                  {
                    citationId: 100,
                    verdict:
                      'contradicts',
                    evidenceRef:
                      'source-100#p2',
                  },
                ],
              }),
            ],
          })

        expect(result.valid)
          .toBe(false)

        expect(result.reasons)
          .toContain(
            'supported_with_contradicting_evidence',
          )
      },
    )

    it(
      'nu acceptă contradicted fără evidence contradictoriu',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                supportStatus:
                  'contradicted',
                citationChecks: [
                  {
                    citationId: 100,
                    verdict:
                      'supports',
                    evidenceRef:
                      'source-100#p2',
                  },
                ],
              }),
            ],
          })

        expect(result.reasons)
          .toContain(
            'contradicted_without_contradicting_evidence',
          )
      },
    )

    it(
      'nu permite unui model singur să declare fabricație autoritativă',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                explicitlyFabricated:
                  true,
              }),
            ],
          })

        expect(result.valid)
          .toBe(false)

        expect(result.reasons)
          .toContain(
            'model_only_fabrication_not_authoritative',
          )

        expect(
          result.verifiedClaims[0]
            .explicitlyFabricated,
        ).toBe(false)
      },
    )

    it(
      'permite constatarea umană explicită de fabricație',
      () => {
        const result =
          validateFlashFactualProvenance({
            claims: [claim()],
            verifications: [
              verification({
                method: 'human',
                generationRunId: null,
                verificationRunId: null,
                explicitlyFabricated:
                  true,
              }),
            ],
          })

        expect(result.valid)
          .toBe(true)

        expect(
          result.verifiedClaims[0]
            .explicitlyFabricated,
        ).toBe(true)
      },
    )
  },
)
