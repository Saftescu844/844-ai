import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashDecisionInput,
  type FlashDecisionRecord,
  type FlashDecisionSource,
} from '@/lib/flash/decisionInputAdapter'

import {
  evaluateFlashDecision,
} from '@/lib/flash/decisionEngine'

import {
  aggregateFlashRuntimeEvidence,
  type FlashRuntimeEvidenceAggregatorInput,
} from '@/lib/flash/runtimeEvidence/runtimeEvidenceAggregator'

function completeInput():
  FlashRuntimeEvidenceAggregatorInput {
  return {
    pairCompleteness: {
      roComplete: true,
      enComplete: true,
    },

    dedup: {
      dedupPassed: true,
      obviousDuplicate: false,
    },

    sourceVerification: {
      sourceVerificationPassed:
        true,
    },

    factualSupport: {
      factsSupportedBySources:
        true,
      fabricatedInformation:
        false,
      fabricatedCitations:
        false,
    },

    contradictions: {
      materialContradictions:
        false,
    },

    safety: {
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
    },

    medicalInterpretation: {
      importantMedicalInterpretation:
        false,
    },

    extraordinaryClaim: {
      extraordinaryClaimNeedsReview:
        false,
    },

    regulatoryStatus: {
      regulatoryStatusUnclear:
        false,
    },
  }
}

const validFlash =
  (): FlashDecisionRecord => ({
    informationStatus:
      'official',

    riskLevel:
      'low',

    isHealthRelated:
      false,

    clinicalValidationStatus:
      'notApplicable',

    disclaimerTypes: [],
  })

const validSource =
  (): FlashDecisionSource => ({
    registered: true,
    active: true,
    hasConcreteURL: true,
    allowIngestion: true,
    allowAutoPublish: true,
    editorialTrust: 'high',
  })

describe(
  'Flash runtime evidence aggregator',
  () => {
    it(
      'aggregates a complete safe evidence set',
      () => {
        const result =
          aggregateFlashRuntimeEvidence(
            completeInput(),
          )

        expect(result.complete)
          .toBe(true)

        expect(
          result.missingComponents,
        ).toEqual([])

        expect(
          result.decisionEvidence,
        ).toEqual({
          roComplete: true,
          enComplete: true,

          dedupPassed: true,
          sourceVerificationPassed:
            true,
          factsSupportedBySources:
            true,
          materialContradictions:
            false,
          engineCertain: true,

          safetyGateTriggered:
            false,
          importantMedicalInterpretation:
            false,
          extraordinaryClaimNeedsReview:
            false,
          regulatoryStatusUnclear:
            false,

          obviousDuplicate:
            false,
          unverifiableSources:
            false,
          fabricatedInformation:
            false,
          fabricatedCitations:
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
        })
      },
    )

    it(
      'complete safe evidence preserves AUTO eligibility',
      () => {
        const aggregated =
          aggregateFlashRuntimeEvidence(
            completeInput(),
          )

        const decisionInput =
          buildFlashDecisionInput({
            flash: validFlash(),

            sources: [
              validSource(),
            ],

            evidence:
              aggregated
                .decisionEvidence,
          })

        expect(
          evaluateFlashDecision(
            decisionInput,
          ),
        ).toEqual({
          decision:
            'autoPublish',

          reasons: [
            'auto_publish_gates_passed',
          ],
        })
      },
    )

    it(
      'missing component makes engine uncertain without inventing a BLOCK',
      () => {
        const input =
          completeInput()

        input.safety = null

        const result =
          aggregateFlashRuntimeEvidence(
            input,
          )

        expect(result.complete)
          .toBe(false)

        expect(
          result.missingComponents,
        ).toEqual([
          'safety',
        ])

        expect(
          result
            .decisionEvidence
            .engineCertain,
        ).toBe(false)

        expect(
          result
            .decisionEvidence
            .dangerousInstructions,
        ).toBe(false)

        expect(
          result
            .decisionEvidence
            .fundamentalEditorialViolation,
        ).toBe(false)
      },
    )

    it(
      'tracks multiple missing components in stable order',
      () => {
        const input =
          completeInput()

        input.dedup = null
        input.factualSupport =
          null
        input.regulatoryStatus =
          null

        const result =
          aggregateFlashRuntimeEvidence(
            input,
          )

        expect(
          result.missingComponents,
        ).toEqual([
          'dedup',
          'factualSupport',
          'regulatoryStatus',
        ])

        expect(
          result
            .decisionEvidence
            .engineCertain,
        ).toBe(false)

        expect(
          result
            .decisionEvidence
            .dedupPassed,
        ).toBe(false)

        expect(
          result
            .decisionEvidence
            .factsSupportedBySources,
        ).toBe(false)
      },
    )

    it(
      'preserves a confirmed duplicate BLOCK',
      () => {
        const input =
          completeInput()

        input.dedup = {
          dedupPassed: false,
          obviousDuplicate:
            true,
        }

        const aggregated =
          aggregateFlashRuntimeEvidence(
            input,
          )

        const decisionInput =
          buildFlashDecisionInput({
            flash: validFlash(),

            sources: [
              validSource(),
            ],

            evidence:
              aggregated
                .decisionEvidence,
          })

        expect(
          evaluateFlashDecision(
            decisionInput,
          ),
        ).toEqual({
          decision: 'blocked',

          reasons: [
            'obvious_duplicate',
          ],
        })
      },
    )

    it(
      'preserves authoritative factual fabrication BLOCK evidence',
      () => {
        const input =
          completeInput()

        input.factualSupport = {
          factsSupportedBySources:
            false,
          fabricatedInformation:
            true,
          fabricatedCitations:
            false,
        }

        const aggregated =
          aggregateFlashRuntimeEvidence(
            input,
          )

        const decisionInput =
          buildFlashDecisionInput({
            flash: validFlash(),

            sources: [
              validSource(),
            ],

            evidence:
              aggregated
                .decisionEvidence,
          })

        expect(
          evaluateFlashDecision(
            decisionInput,
          ),
        ).toEqual({
          decision: 'blocked',

          reasons: [
            'fabricated_information',
          ],
        })
      },
    )

    it(
      'preserves confirmed safety BLOCK evidence',
      () => {
        const input =
          completeInput()

        input.safety = {
          ...input.safety!,

          dangerousInstructions:
            true,
        }

        const aggregated =
          aggregateFlashRuntimeEvidence(
            input,
          )

        const decisionInput =
          buildFlashDecisionInput({
            flash: validFlash(),

            sources: [
              validSource(),
            ],

            evidence:
              aggregated
                .decisionEvidence,
          })

        expect(
          evaluateFlashDecision(
            decisionInput,
          ),
        ).toEqual({
          decision: 'blocked',

          reasons: [
            'dangerous_instructions',
          ],
        })
      },
    )

    it(
      'preserves review-only evidence without marking the engine uncertain',
      () => {
        const input =
          completeInput()

        input.medicalInterpretation = {
          importantMedicalInterpretation:
            true,
        }

        const result =
          aggregateFlashRuntimeEvidence(
            input,
          )

        expect(result.complete)
          .toBe(true)

        expect(
          result
            .decisionEvidence
            .engineCertain,
        ).toBe(true)

        expect(
          result
            .decisionEvidence
            .importantMedicalInterpretation,
        ).toBe(true)
      },
    )

    it(
      'source verification failure stays REVIEW and does not become unverifiable-sources BLOCK',
      () => {
        const input =
          completeInput()

        input.sourceVerification = {
          sourceVerificationPassed:
            false,
        }

        const aggregated =
          aggregateFlashRuntimeEvidence(
            input,
          )

        expect(
          aggregated
            .decisionEvidence
            .engineCertain,
        ).toBe(true)

        expect(
          aggregated
            .decisionEvidence
            .unverifiableSources,
        ).toBe(false)

        const decisionInput =
          buildFlashDecisionInput({
            flash: validFlash(),

            sources: [
              validSource(),
            ],

            evidence:
              aggregated
                .decisionEvidence,
          })

        expect(
          evaluateFlashDecision(
            decisionInput,
          ),
        ).toEqual({
          decision: 'review',

          reasons: [
            'sources_not_validated',
          ],
        })
      },
    )

    it(
      'known RO/EN incompleteness does not mean engine uncertainty',
      () => {
        const input =
          completeInput()

        input.pairCompleteness = {
          roComplete: false,
          enComplete: true,
        }

        const aggregated =
          aggregateFlashRuntimeEvidence(
            input,
          )

        expect(
          aggregated
            .decisionEvidence
            .engineCertain,
        ).toBe(true)

        const decisionInput =
          buildFlashDecisionInput({
            flash: validFlash(),

            sources: [
              validSource(),
            ],

            evidence:
              aggregated
                .decisionEvidence,
          })

        expect(
          evaluateFlashDecision(
            decisionInput,
          ),
        ).toEqual({
          decision: 'review',

          reasons: [
            'missing_ro_version',
          ],
        })
      },
    )
  },
)
