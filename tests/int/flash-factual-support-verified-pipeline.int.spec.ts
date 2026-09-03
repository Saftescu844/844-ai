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
  buildFlashVerifiedFactualDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/factualSupportVerifiedPipeline'

import type {
  FlashClaimCandidate,
  FlashClaimVerification,
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

function decisionFromPipeline(
  claims: FlashClaimCandidate[],
  verifications: FlashClaimVerification[],
) {
  const pipeline =
    buildFlashVerifiedFactualDecisionEvidence({
      claims,
      verifications,
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
        ...pipeline.decisionEvidence,
      },
    })

  return {
    pipeline,
    decision:
      evaluateFlashDecision(input),
  }
}

describe(
  'Flash verified factual pipeline',
  () => {
    it(
      'permite claims verificate valid să ajungă la factual support',
      () => {
        const result =
          buildFlashVerifiedFactualDecisionEvidence({
            claims: [claim()],
            verifications: [
              verification(),
            ],
          })

        expect(
          result.provenance.valid,
        ).toBe(true)

        expect(
          result.factualSupport,
        ).not.toBeNull()

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
      'provenance invalid oprește claims înainte de factual support',
      () => {
        const result =
          buildFlashVerifiedFactualDecisionEvidence({
            claims: [claim()],
            verifications: [
              verification({
                verificationRunId:
                  'generation-1',
              }),
            ],
          })

        expect(
          result.provenance.valid,
        ).toBe(false)

        expect(
          result.factualSupport,
        ).toBeNull()

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
      'verificarea validă unsupported ajunge la factual support',
      () => {
        const result =
          buildFlashVerifiedFactualDecisionEvidence({
            claims: [claim()],
            verifications: [
              verification({
                supportStatus:
                  'unsupported',
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

        expect(
          result.provenance.valid,
        ).toBe(true)

        expect(
          result.decisionEvidence
            .factsSupportedBySources,
        ).toBe(false)

        expect(
          result.decisionEvidence
            .fabricatedInformation,
        ).toBe(false)
      },
    )

    it(
      'constatarea umană validă de fabricație poate ajunge la BLOCK evidence',
      () => {
        const result =
          buildFlashVerifiedFactualDecisionEvidence({
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

        expect(
          result.provenance.valid,
        ).toBe(true)

        expect(
          result.decisionEvidence
            .fabricatedInformation,
        ).toBe(true)
      },
    )

    it(
      'model-only fabrication invalidă nu poate produce BLOCK evidence',
      () => {
        const result =
          buildFlashVerifiedFactualDecisionEvidence({
            claims: [claim()],
            verifications: [
              verification({
                explicitlyFabricated:
                  true,
              }),
            ],
          })

        expect(
          result.provenance.valid,
        ).toBe(false)

        expect(
          result.factualSupport,
        ).toBeNull()

        expect(
          result.decisionEvidence
            .fabricatedInformation,
        ).toBe(false)
      },
    )

    it(
      'supported valid permite AUTO când toate celelalte gate-uri sunt curate',
      () => {
        const result =
          decisionFromPipeline(
            [claim()],
            [verification()],
          )

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
      'provenance invalid produce REVIEW, nu AUTO sau BLOCK',
      () => {
        const result =
          decisionFromPipeline(
            [claim()],
            [
              verification({
                verificationRunId:
                  'generation-1',
              }),
            ],
          )

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
      'constatarea umană validă de fabricație produce BLOCK',
      () => {
        const result =
          decisionFromPipeline(
            [claim()],
            [
              verification({
                method: 'human',
                generationRunId: null,
                verificationRunId: null,
                fabricatedCitation:
                  true,
              }),
            ],
          )

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
