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
  buildFlashContradictionDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/contradictionDecisionAdapter'

import type {
  FlashContradictionCase,
} from '@/lib/flash/runtimeEvidence/contradictionEvidence'

function contradictionCase(
  overrides:
    Partial<FlashContradictionCase> = {},
): FlashContradictionCase {
  return {
    id: 'conflict-1',
    subjectId: 'claim-1',

    firstPosition: {
      citationId: 100,
      evidenceRef:
        'source-100#section-2',
    },

    secondPosition: {
      citationId: 200,
      evidenceRef:
        'source-200#section-4',
    },

    relation: 'materialConflict',
    comparable: true,
    material: true,

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

function decisionFromCases(
  cases: FlashContradictionCase[],
) {
  const adapter =
    buildFlashContradictionDecisionEvidence({
      cases,
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
  'Flash contradiction decision adapter',
  () => {
    it(
      'mapează conflictul material confirmat către decision evidence',
      () => {
        const result =
          buildFlashContradictionDecisionEvidence({
            cases: [
              contradictionCase(),
            ],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          materialContradictions:
            true,
        })

        expect(
          result.contradictionEvidence
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it(
      'o simplă contestare nu setează materialContradictions',
      () => {
        const result =
          buildFlashContradictionDecisionEvidence({
            cases: [
              contradictionCase({
                relation:
                  'contestation',
              }),
            ],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          materialContradictions:
            false,
        })

        expect(
          result.contradictionEvidence
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it(
      'diferența de context nu produce gate editorial',
      () => {
        const result =
          buildFlashContradictionDecisionEvidence({
            cases: [
              contradictionCase({
                relation:
                  'contextDifference',
              }),
            ],
          })

        expect(
          result.decisionEvidence
            .materialContradictions,
        ).toBe(false)

        expect(
          result.contradictionEvidence
            .articleDisclosureSuggested,
        ).toBe(false)
      },
    )

    it(
      'conflictul material confirmat produce REVIEW',
      () => {
        const result =
          decisionFromCases([
            contradictionCase(),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'review',
            reasons: [
              'material_contradictions',
            ],
          })
      },
    )

    it(
      'simpla contestare nu produce REVIEW automat',
      () => {
        const result =
          decisionFromCases([
            contradictionCase({
              relation:
                'contestation',
            }),
          ])

        expect(result.decision)
          .toEqual({
            decision: 'autoPublish',
            reasons: [
              'auto_publish_gates_passed',
            ],
          })

        expect(
          result.adapter
            .contradictionEvidence
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it(
      'acuzația fără evidence comparabil nu produce contradicție materială',
      () => {
        const result =
          decisionFromCases([
            contradictionCase({
              secondPosition: {
                citationId: 200,
                evidenceRef: null,
              },
            }),
          ])

        expect(
          result.adapter
            .decisionEvidence
            .materialContradictions,
        ).toBe(false)

        expect(result.decision)
          .toEqual({
            decision: 'autoPublish',
            reasons: [
              'auto_publish_gates_passed',
            ],
          })

        expect(
          result.adapter
            .contradictionEvidence
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )
  },
)
