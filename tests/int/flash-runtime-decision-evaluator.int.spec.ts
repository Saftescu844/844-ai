import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashDecisionRecord,
  FlashDecisionSource,
} from '@/lib/flash/decisionInputAdapter'

import {
  evaluateFlashRuntimeDecision,
} from '@/lib/flash/runtimeEvidence/runtimeDecisionEvaluator'

import type {
  FlashRuntimeEvidenceAggregatorInput,
} from '@/lib/flash/runtimeEvidence/runtimeEvidenceAggregator'

function completeRuntimeEvidence():
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

function validFlash(
  overrides:
    Partial<FlashDecisionRecord> = {},
): FlashDecisionRecord {
  return {
    informationStatus:
      'official',

    riskLevel:
      'low',

    isHealthRelated:
      false,

    clinicalValidationStatus:
      'notApplicable',

    disclaimerTypes: [],

    ...overrides,
  }
}

function validSource(
  overrides:
    Partial<FlashDecisionSource> = {},
): FlashDecisionSource {
  return {
    registered: true,
    active: true,
    hasConcreteURL: true,
    allowIngestion: true,
    allowAutoPublish: true,
    editorialTrust: 'high',

    ...overrides,
  }
}

describe(
  'Flash runtime decision evaluator',
  () => {
    it(
      'returns AUTO for a complete safe Flash',
      () => {
        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash(),

            sources: [
              validSource(),
            ],

            runtimeEvidence:
              completeRuntimeEvidence(),
          })

        expect(
          result
            .aggregatedEvidence
            .complete,
        ).toBe(true)

        expect(
          result
            .decisionInput
            .engineCertain,
        ).toBe(true)

        expect(
          result.decision,
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
      'missing runtime component produces engine uncertainty',
      () => {
        const runtimeEvidence =
          completeRuntimeEvidence()

        runtimeEvidence.safety =
          null

        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash(),

            sources: [
              validSource(),
            ],

            runtimeEvidence,
          })

        expect(
          result
            .aggregatedEvidence
            .missingComponents,
        ).toEqual([
          'safety',
        ])

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'engine_uncertain',
          ],
        })
      },
    )

    it(
      'missing source verification stays REVIEW rather than BLOCK',
      () => {
        const runtimeEvidence =
          completeRuntimeEvidence()

        runtimeEvidence
          .sourceVerification =
          null

        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash(),

            sources: [
              validSource(),
            ],

            runtimeEvidence,
          })

        expect(
          result
            .decisionInput
            .unverifiableSources,
        ).toBe(false)

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'sources_not_validated',
            'engine_uncertain',
          ],
        })
      },
    )

    it(
      'preserves medical interpretation REVIEW',
      () => {
        const runtimeEvidence =
          completeRuntimeEvidence()

        runtimeEvidence
          .medicalInterpretation = {
          importantMedicalInterpretation:
            true,
        }

        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash(),

            sources: [
              validSource(),
            ],

            runtimeEvidence,
          })

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'important_medical_interpretation',
          ],
        })
      },
    )

    it(
      'confirmed BLOCK evidence wins over review conditions',
      () => {
        const runtimeEvidence =
          completeRuntimeEvidence()

        runtimeEvidence
          .pairCompleteness = {
          roComplete: false,
          enComplete: true,
        }

        runtimeEvidence.safety = {
          ...runtimeEvidence
            .safety!,

          dangerousInstructions:
            true,
        }

        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash({
                riskLevel:
                  'high',
              }),

            sources: [
              validSource(),
            ],

            runtimeEvidence,
          })

        expect(
          result.decision,
        ).toEqual({
          decision:
            'blocked',

          reasons: [
            'dangerous_instructions',
          ],
        })
      },
    )

    it(
      'source policy can require REVIEW without runtime uncertainty',
      () => {
        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash(),

            sources: [
              validSource({
                allowAutoPublish:
                  false,
              }),
            ],

            runtimeEvidence:
              completeRuntimeEvidence(),
          })

        expect(
          result
            .decisionInput
            .engineCertain,
        ).toBe(true)

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'source_auto_publish_disabled',
          ],
        })
      },
    )

    it(
      'health Flash without required disclaimers goes to REVIEW',
      () => {
        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash({
                isHealthRelated:
                  true,

                disclaimerTypes:
                  [],
              }),

            sources: [
              validSource(),
            ],

            runtimeEvidence:
              completeRuntimeEvidence(),
          })

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'required_disclaimers_missing',
          ],
        })
      },
    )

    it(
      'health category alone does not prevent AUTO',
      () => {
        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash({
                isHealthRelated:
                  true,

                disclaimerTypes: [
                  'medicalInformational',
                  'specialistDecision',
                ],
              }),

            sources: [
              validSource(),
            ],

            runtimeEvidence:
              completeRuntimeEvidence(),
          })

        expect(
          result.decision,
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
      'known incomplete RO version produces the existing REVIEW reason',
      () => {
        const runtimeEvidence =
          completeRuntimeEvidence()

        runtimeEvidence
          .pairCompleteness = {
          roComplete: false,
          enComplete: true,
        }

        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash(),

            sources: [
              validSource(),
            ],

            runtimeEvidence,
          })

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'missing_ro_version',
          ],
        })
      },
    )

    it(
      'regulatory uncertainty uses the existing disclaimer and REVIEW gates',
      () => {
        const runtimeEvidence =
          completeRuntimeEvidence()

        runtimeEvidence
          .regulatoryStatus = {
          regulatoryStatusUnclear:
            true,
        }

        const result =
          evaluateFlashRuntimeDecision({
            flash:
              validFlash({
                disclaimerTypes: [
                  'regulatoryStatusLimitedOrUnclear',
                ],
              }),

            sources: [
              validSource(),
            ],

            runtimeEvidence,
          })

        expect(
          result
            .decisionInput
            .requiredDisclaimersApplied,
        ).toBe(true)

        expect(
          result.decision,
        ).toEqual({
          decision:
            'review',

          reasons: [
            'regulatory_status_unclear',
          ],
        })
      },
    )
  },
)
