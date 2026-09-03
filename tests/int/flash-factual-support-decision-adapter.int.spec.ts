import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashDecisionInput,
  type FlashDecisionEvidence,
} from '@/lib/flash/decisionInputAdapter'

import {
  evaluateFlashDecision,
} from '@/lib/flash/decisionEngine'

import {
  buildFlashFactualDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/factualSupportDecisionAdapter'

import type {
  FlashFactualClaim,
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

const safeEvidence:
  FlashDecisionEvidence = {
    roComplete: true,
    enComplete: true,

    dedupPassed: true,
    sourceVerificationPassed: true,
    factsSupportedBySources: true,
    materialContradictions: false,
    engineCertain: true,

    safetyGateTriggered: false,
    importantMedicalInterpretation: false,
    extraordinaryClaimNeedsReview: false,
    regulatoryStatusUnclear: false,

    obviousDuplicate: false,
    unverifiableSources: false,
    fabricatedInformation: false,
    fabricatedCitations: false,

    individualDiagnosis: false,
    individualTreatmentRecommendation: false,
    medicationChange: false,
    dangerousInstructions: false,
    fundamentalEditorialViolation: false,
  }

function decisionFromClaims(
  claims: FlashFactualClaim[],
) {
  const factual =
    buildFlashFactualDecisionEvidence({
      claims,
    })

  const input =
    buildFlashDecisionInput({
      flash: {
        informationStatus: 'official',
        riskLevel: 'low',
        isHealthRelated: false,
        clinicalValidationStatus:
          'notApplicable',
        disclaimerTypes: [],
      },

      sources: [
        {
          registered: true,
          active: true,
          hasConcreteURL: true,
          allowIngestion: true,
          allowAutoPublish: true,
          editorialTrust: 'high',
        },
      ],

      evidence: {
        ...safeEvidence,
        ...factual.decisionEvidence,
      },
    })

  return {
    factual,
    decision:
      evaluateFlashDecision(input),
  }
}

describe(
  'Flash factual support -> decision adapter',
  () => {
    it(
      'mapează suportul factual valid în cele trei semnale de decizie',
      () => {
        const result =
          buildFlashFactualDecisionEvidence({
            claims: [claim()],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          factsSupportedBySources: true,
          fabricatedInformation: false,
          fabricatedCitations: false,
        })
      },
    )

    it(
      'afirmația nesusținută oprește suportul factual fără a inventa fabricație',
      () => {
        const result =
          buildFlashFactualDecisionEvidence({
            claims: [
              claim({
                supportStatus:
                  'unsupported',
              }),
            ],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          factsSupportedBySources: false,
          fabricatedInformation: false,
          fabricatedCitations: false,
        })
      },
    )

    it(
      'fabricația explicită este transferată către Decision Engine',
      () => {
        const result =
          buildFlashFactualDecisionEvidence({
            claims: [
              claim({
                explicitlyFabricated:
                  true,
              }),
            ],
          })

        expect(
          result.decisionEvidence
            .fabricatedInformation,
        ).toBe(true)

        expect(
          result.decisionEvidence
            .factsSupportedBySources,
        ).toBe(false)
      },
    )

    it(
      'citarea fabricată este transferată către Decision Engine',
      () => {
        const result =
          buildFlashFactualDecisionEvidence({
            claims: [
              claim({
                fabricatedCitation:
                  true,
              }),
            ],
          })

        expect(
          result.decisionEvidence
            .fabricatedCitations,
        ).toBe(true)

        expect(
          result.decisionEvidence
            .factsSupportedBySources,
        ).toBe(false)
      },
    )

    it(
      'suportul factual valid permite AUTO când restul gate-urilor sunt curate',
      () => {
        const result =
          decisionFromClaims([
            claim(),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'autoPublish',
            reasons: [
              'auto_publish_gates_passed',
            ],
          })
      },
    )

    it(
      'afirmația nesusținută produce REVIEW, nu BLOCK',
      () => {
        const result =
          decisionFromClaims([
            claim({
              supportStatus:
                'unsupported',
            }),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'review',
            reasons: [
              'facts_not_supported',
            ],
          })
      },
    )

    it(
      'fabricația explicită produce BLOCK',
      () => {
        const result =
          decisionFromClaims([
            claim({
              explicitlyFabricated:
                true,
            }),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'blocked',
            reasons: [
              'fabricated_information',
            ],
          })
      },
    )

    it(
      'citarea fabricată produce BLOCK',
      () => {
        const result =
          decisionFromClaims([
            claim({
              fabricatedCitation:
                true,
            }),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'blocked',
            reasons: [
              'fabricated_citations',
            ],
          })
      },
    )
  },
)
