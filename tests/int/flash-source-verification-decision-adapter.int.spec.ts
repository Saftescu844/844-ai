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
  buildFlashSourceVerificationDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/sourceVerificationDecisionAdapter'

import type {
  FlashSourceVerificationCandidate,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'

function source(
  overrides:
    Partial<FlashSourceVerificationCandidate> = {},
): FlashSourceVerificationCandidate {
  return {
    id: 'source-1',
    registeredSourceUrl:
      'https://example.com',
    concreteUrl:
      'https://example.com/article',
    finalUrl: null,
    retrieved: true,
    contentAvailable: true,
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

function decisionFromSources(
  verificationSources:
    FlashSourceVerificationCandidate[],
) {
  const adapter =
    buildFlashSourceVerificationDecisionEvidence(
      verificationSources,
    )

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
        ...adapter.decisionEvidence,
      },
    })

  return {
    adapter,
    decision:
      evaluateFlashDecision(input),
  }
}

describe(
  'Flash source verification decision adapter',
  () => {
    it(
      'mapează sursa verificată către decision evidence',
      () => {
        const result =
          buildFlashSourceVerificationDecisionEvidence([
            source(),
          ])

        expect(
          result.decisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            true,
        })
      },
    )

    it(
      'retrieval eșuat produce sourceVerificationPassed false',
      () => {
        const result =
          buildFlashSourceVerificationDecisionEvidence([
            source({
              retrieved: false,
            }),
          ])

        expect(
          result.decisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            false,
        })
      },
    )

    it(
      'identitatea de domeniu greșită produce sourceVerificationPassed false',
      () => {
        const result =
          buildFlashSourceVerificationDecisionEvidence([
            source({
              concreteUrl:
                'https://other.test/article',
            }),
          ])

        expect(
          result.decisionEvidence
            .sourceVerificationPassed,
        ).toBe(false)
      },
    )

    it(
      'sursa verificată păstrează AUTO când toate celelalte gate-uri sunt curate',
      () => {
        const result =
          decisionFromSources([
            source(),
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
      'retrieval eșuat produce REVIEW pentru sources_not_validated',
      () => {
        const result =
          decisionFromSources([
            source({
              retrieved: false,
            }),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'review',
            reasons: [
              'sources_not_validated',
            ],
          })
      },
    )

    it(
      'domeniul nepotrivit produce REVIEW, nu BLOCK',
      () => {
        const result =
          decisionFromSources([
            source({
              concreteUrl:
                'https://other.test/article',
            }),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'review',
            reasons: [
              'sources_not_validated',
            ],
          })
      },
    )
  },
)
