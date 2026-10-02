import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashDecisionInput,
  type FlashDecisionEvidence,
  type FlashDecisionRecord,
  type FlashDecisionSource,
} from '@/lib/flash/decisionInputAdapter'

import {
  evaluateFlashDecision,
} from '@/lib/flash/decisionEngine'

import {
  buildFlashExtraordinaryClaimDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/extraordinaryClaimDecisionAdapter'

const baseEvidence =
  (): FlashDecisionEvidence => ({
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
  })

const validFlash =
  (): FlashDecisionRecord => ({
    informationStatus: 'official',
    riskLevel: 'low',
    isHealthRelated: false,
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
  'Flash extraordinary claim decision adapter',
  () => {
    it(
      'maps clean evidence to false',
      () => {
        const result =
          buildFlashExtraordinaryClaimDecisionEvidence({
            findings: [],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            false,
        })
      },
    )

    it(
      'maps confirmed extraordinary claim to true',
      () => {
        const result =
          buildFlashExtraordinaryClaimDecisionEvidence({
            findings: [
              {
                id: 'extraordinary-1',
                type:
                  'breakthroughOrCureClaim',
                verdict:
                  'present',
                evidenceRef:
                  'claim:breakthrough-1',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .extraordinaryClaimEvidence
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(true)
      },
    )

    it(
      'maps uncertain extraordinary claim conservatively to REVIEW evidence',
      () => {
        const result =
          buildFlashExtraordinaryClaimDecisionEvidence({
            findings: [
              {
                id: 'extraordinary-2',
                type:
                  'nearPerfectPerformance',
                verdict:
                  'uncertain',
                evidenceRef:
                  'claim:performance-1',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .extraordinaryClaimEvidence
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)
      },
    )

    it(
      'maps present extraordinary claim without evidence conservatively to REVIEW',
      () => {
        const result =
          buildFlashExtraordinaryClaimDecisionEvidence({
            findings: [
              {
                id: 'extraordinary-3',
                type:
                  'unprecedentedCapability',
                verdict:
                  'present',
                evidenceRef: ' ',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .extraordinaryClaimNeedsReview,
        ).toBe(true)

        expect(
          result
            .extraordinaryClaimEvidence
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)
      },
    )

    it(
      'extraordinary claim produces REVIEW in Decision Engine',
      () => {
        const extraordinary =
          buildFlashExtraordinaryClaimDecisionEvidence({
            findings: [
              {
                id:
                  'extraordinary-review-1',
                type:
                  'replacementOfEstablishedPractice',
                verdict:
                  'present',
                evidenceRef:
                  'claim:replacement-1',
              },
            ],
          })

        const input =
          buildFlashDecisionInput({
            flash:
              validFlash(),

            sources: [
              validSource(),
            ],

            evidence: {
              ...baseEvidence(),
              ...extraordinary
                .decisionEvidence,
            },
          })

        expect(
          evaluateFlashDecision(
            input,
          ),
        ).toEqual({
          decision: 'review',
          reasons: [
            'extraordinary_claim',
          ],
        })
      },
    )
  },
)
