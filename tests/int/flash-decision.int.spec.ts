import { describe, expect, it } from 'vitest'

import {
  evaluateFlashDecision,
  type FlashDecisionInput,
  type FlashDecisionReason,
} from '@/lib/flash/decisionEngine'

const validInput = (
  overrides: Partial<FlashDecisionInput> = {},
): FlashDecisionInput => ({
  informationStatus: 'official',
  riskLevel: 'low',

  roComplete: true,
  enComplete: true,

  dedupPassed: true,
  sourcesValid: true,
  factsSupportedBySources: true,
  materialContradictions: false,

  sourceAllowsAutoPublish: true,
  requiredDisclaimersApplied: true,
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

  ...overrides,
})

describe('Flash decision engine', () => {
  describe('AUTO', () => {
    it.each([
      'official',
      'confirmed',
      'emerging',
      'preliminary',
    ] as const)(
      'permite AUTO pentru informationStatus=%s când toate gate-urile trec',
      (informationStatus) => {
        const result = evaluateFlashDecision(
          validInput({ informationStatus }),
        )

        expect(result).toEqual({
          decision: 'autoPublish',
          reasons: ['auto_publish_gates_passed'],
        })
      },
    )
  })

  describe('REVIEW', () => {
    const cases: Array<{
      name: string
      override: Partial<FlashDecisionInput>
      reason: FlashDecisionReason
    }> = [
      {
        name: 'lipsește versiunea RO',
        override: { roComplete: false },
        reason: 'missing_ro_version',
      },
      {
        name: 'lipsește versiunea EN',
        override: { enComplete: false },
        reason: 'missing_en_version',
      },
      {
        name: 'deduplicarea nu a trecut',
        override: { dedupPassed: false },
        reason: 'dedup_not_passed',
      },
      {
        name: 'sursele nu sunt validate',
        override: { sourcesValid: false },
        reason: 'sources_not_validated',
      },
      {
        name: 'faptele nu sunt susținute de surse',
        override: { factsSupportedBySources: false },
        reason: 'facts_not_supported',
      },
      {
        name: 'există contradicții materiale',
        override: { materialContradictions: true },
        reason: 'material_contradictions',
      },
      {
        name: 'riscul este medium',
        override: { riskLevel: 'medium' },
        reason: 'risk_medium',
      },
      {
        name: 'riscul este high',
        override: { riskLevel: 'high' },
        reason: 'risk_high',
      },
      {
        name: 'informația este disputed',
        override: { informationStatus: 'disputed' },
        reason: 'information_disputed',
      },
      {
        name: 'sursa nu permite AUTO',
        override: { sourceAllowsAutoPublish: false },
        reason: 'source_auto_publish_disabled',
      },
      {
        name: 'disclaimer-ele obligatorii lipsesc',
        override: { requiredDisclaimersApplied: false },
        reason: 'required_disclaimers_missing',
      },
      {
        name: 'safety gate declanșat',
        override: { safetyGateTriggered: true },
        reason: 'safety_gate_triggered',
      },
      {
        name: 'interpretare medicală importantă',
        override: { importantMedicalInterpretation: true },
        reason: 'important_medical_interpretation',
      },
      {
        name: 'afirmație extraordinară',
        override: { extraordinaryClaimNeedsReview: true },
        reason: 'extraordinary_claim',
      },
      {
        name: 'statut regulator neclar',
        override: { regulatoryStatusUnclear: true },
        reason: 'regulatory_status_unclear',
      },
      {
        name: 'engine-ul este incert',
        override: { engineCertain: false },
        reason: 'engine_uncertain',
      },
    ]

    it.each(cases)('$name → REVIEW', ({ override, reason }) => {
      const result = evaluateFlashDecision(
        validInput(override),
      )

      expect(result.decision).toBe('review')
      expect(result.reasons).toContain(reason)
    })
  })

  describe('BLOCK', () => {
    const cases: Array<{
      name: string
      override: Partial<FlashDecisionInput>
      reason: FlashDecisionReason
    }> = [
      {
        name: 'informație neverificată',
        override: { informationStatus: 'unverified' },
        reason: 'information_unverified',
      },
      {
        name: 'duplicat evident',
        override: { obviousDuplicate: true },
        reason: 'obvious_duplicate',
      },
      {
        name: 'surse neverificabile',
        override: { unverifiableSources: true },
        reason: 'unverifiable_sources',
      },
      {
        name: 'informație fabricată',
        override: { fabricatedInformation: true },
        reason: 'fabricated_information',
      },
      {
        name: 'citări fabricate',
        override: { fabricatedCitations: true },
        reason: 'fabricated_citations',
      },
      {
        name: 'diagnostic individual',
        override: { individualDiagnosis: true },
        reason: 'individual_diagnosis',
      },
      {
        name: 'tratament recomandat individual',
        override: {
          individualTreatmentRecommendation: true,
        },
        reason: 'individual_treatment_recommendation',
      },
      {
        name: 'modificare de medicație',
        override: { medicationChange: true },
        reason: 'medication_change',
      },
      {
        name: 'instrucțiuni periculoase',
        override: { dangerousInstructions: true },
        reason: 'dangerous_instructions',
      },
      {
        name: 'încălcare editorială fundamentală',
        override: { fundamentalEditorialViolation: true },
        reason: 'fundamental_editorial_violation',
      },
    ]

    it.each(cases)('$name → BLOCK', ({ override, reason }) => {
      const result = evaluateFlashDecision(
        validInput(override),
      )

      expect(result.decision).toBe('blocked')
      expect(result.reasons).toContain(reason)
    })
  })

  it('BLOCK are prioritate peste REVIEW', () => {
    const result = evaluateFlashDecision(
      validInput({
        informationStatus: 'unverified',
        riskLevel: 'high',
        engineCertain: false,
      }),
    )

    expect(result.decision).toBe('blocked')
    expect(result.reasons).toContain(
      'information_unverified',
    )
    expect(result.reasons).not.toContain('risk_high')
    expect(result.reasons).not.toContain('engine_uncertain')
  })

  it('poate întoarce mai multe motive de REVIEW', () => {
    const result = evaluateFlashDecision(
      validInput({
        enComplete: false,
        riskLevel: 'medium',
        engineCertain: false,
      }),
    )

    expect(result.decision).toBe('review')
    expect(result.reasons).toEqual([
      'missing_en_version',
      'risk_medium',
      'engine_uncertain',
    ])
  })
})
