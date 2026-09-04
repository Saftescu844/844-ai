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
  buildFlashSafetyDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/safetyDecisionAdapter'

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
  'Flash safety decision adapter',
  () => {
    it(
      'maps clean safety evidence to all-false decision evidence',
      () => {
        const result =
          buildFlashSafetyDecisionEvidence({
            findings: [],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
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
        })
      },
    )

    it(
      'maps general safety concern only to REVIEW safety gate',
      () => {
        const result =
          buildFlashSafetyDecisionEvidence({
            findings: [
              {
                id: 'safety-1',
                type:
                  'generalSafetyConcern',
                verdict:
                  'present',
                evidenceRef:
                  'paragraph:3',
              },
            ],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          safetyGateTriggered:
            true,

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
      'uncertain BLOCK-class finding remains REVIEW evidence',
      () => {
        const result =
          buildFlashSafetyDecisionEvidence({
            findings: [
              {
                id: 'safety-2',
                type:
                  'individualDiagnosis',
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
            .safetyGateTriggered,
        ).toBe(true)

        expect(
          result
            .decisionEvidence
            .individualDiagnosis,
        ).toBe(false)
      },
    )

    it(
      'present BLOCK-class finding without evidence remains REVIEW evidence',
      () => {
        const result =
          buildFlashSafetyDecisionEvidence({
            findings: [
              {
                id: 'safety-3',
                type:
                  'medicationChange',
                verdict:
                  'present',
                evidenceRef: ' ',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .safetyGateTriggered,
        ).toBe(true)

        expect(
          result
            .decisionEvidence
            .medicationChange,
        ).toBe(false)
      },
    )

    it.each([
      {
        type:
          'individualDiagnosis',
        field:
          'individualDiagnosis',
      },
      {
        type:
          'individualTreatmentRecommendation',
        field:
          'individualTreatmentRecommendation',
      },
      {
        type:
          'medicationChange',
        field:
          'medicationChange',
      },
      {
        type:
          'dangerousInstructions',
        field:
          'dangerousInstructions',
      },
      {
        type:
          'fundamentalEditorialViolation',
        field:
          'fundamentalEditorialViolation',
      },
    ] as const)(
      '$type maps to its exact BLOCK decision field',
      ({
        type,
        field,
      }) => {
        const result =
          buildFlashSafetyDecisionEvidence({
            findings: [
              {
                id:
                  `safety-${type}`,
                type,
                verdict:
                  'present',
                evidenceRef:
                  'paragraph:9',
              },
            ],
          })

        expect(
          result
            .decisionEvidence[
              field
            ],
        ).toBe(true)

        expect(
          result
            .decisionEvidence
            .safetyGateTriggered,
        ).toBe(false)
      },
    )

    it(
      'general safety concern produces REVIEW in Decision Engine',
      () => {
        const safety =
          buildFlashSafetyDecisionEvidence({
            findings: [
              {
                id:
                  'review-concern',
                type:
                  'generalSafetyConcern',
                verdict:
                  'present',
                evidenceRef:
                  'paragraph:5',
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
              ...safety
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
            'safety_gate_triggered',
          ],
        })
      },
    )

    it(
      'confirmed dangerous instructions produce BLOCK in Decision Engine',
      () => {
        const safety =
          buildFlashSafetyDecisionEvidence({
            findings: [
              {
                id:
                  'danger-1',
                type:
                  'dangerousInstructions',
                verdict:
                  'present',
                evidenceRef:
                  'claim:danger-1',
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
              ...safety
                .decisionEvidence,
            },
          })

        expect(
          evaluateFlashDecision(
            input,
          ),
        ).toEqual({
          decision:
            'blocked',
          reasons: [
            'dangerous_instructions',
          ],
        })
      },
    )
  },
)
