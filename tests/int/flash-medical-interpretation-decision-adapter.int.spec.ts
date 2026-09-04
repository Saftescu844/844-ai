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
  buildFlashMedicalInterpretationDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/medicalInterpretationDecisionAdapter'

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
  'Flash medical interpretation decision adapter',
  () => {
    it(
      'maps clean evidence to false',
      () => {
        const result =
          buildFlashMedicalInterpretationDecisionEvidence({
            findings: [],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            false,
        })
      },
    )

    it(
      'maps confirmed important interpretation to true',
      () => {
        const result =
          buildFlashMedicalInterpretationDecisionEvidence({
            findings: [
              {
                id: 'medical-1',
                type:
                  'clinicalSignificance',
                verdict:
                  'present',
                evidenceRef:
                  'claim:clinical-1',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .medicalInterpretationEvidence
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(true)
      },
    )

    it(
      'maps uncertain interpretation to REVIEW evidence without confirming it',
      () => {
        const result =
          buildFlashMedicalInterpretationDecisionEvidence({
            findings: [
              {
                id: 'medical-2',
                type:
                  'patientApplicability',
                verdict:
                  'uncertain',
                evidenceRef:
                  'paragraph:4',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .medicalInterpretationEvidence
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)
      },
    )

    it(
      'maps present interpretation without evidence conservatively to REVIEW',
      () => {
        const result =
          buildFlashMedicalInterpretationDecisionEvidence({
            findings: [
              {
                id: 'medical-3',
                type:
                  'benefitRiskInterpretation',
                verdict:
                  'present',
                evidenceRef: ' ',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .importantMedicalInterpretation,
        ).toBe(true)

        expect(
          result
            .medicalInterpretationEvidence
            .evaluatedFindings[0]
            .confirmed,
        ).toBe(false)
      },
    )

    it(
      'important medical interpretation produces REVIEW in Decision Engine',
      () => {
        const medical =
          buildFlashMedicalInterpretationDecisionEvidence({
            findings: [
              {
                id:
                  'medical-review-1',
                type:
                  'comparativeClinicalClaim',
                verdict:
                  'present',
                evidenceRef:
                  'claim:comparison-1',
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
              ...medical
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
            'important_medical_interpretation',
          ],
        })
      },
    )
  },
)
