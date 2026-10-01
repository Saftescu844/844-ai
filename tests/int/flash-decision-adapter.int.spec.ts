import { describe, expect, it } from 'vitest'

import {
  buildFlashDecisionInput,
  getRequiredDisclaimerTypes,
  type FlashDecisionAdapterContext,
  type FlashDecisionEvidence,
  type FlashDecisionRecord,
  type FlashDecisionSource,
} from '@/lib/flash/decisionInputAdapter'

import {
  evaluateFlashDecision,
} from '@/lib/flash/decisionEngine'

const validFlash = (
  overrides: Partial<FlashDecisionRecord> = {},
): FlashDecisionRecord => ({
  informationStatus: 'official',
  riskLevel: 'low',
  isHealthRelated: false,
  clinicalValidationStatus: 'notApplicable',
  disclaimerTypes: [],
  ...overrides,
})

const validSource = (
  overrides: Partial<FlashDecisionSource> = {},
): FlashDecisionSource => ({
  registered: true,
  active: true,
  hasConcreteURL: true,
  allowIngestion: true,
  allowAutoPublish: true,
  editorialTrust: 'high',
  ...overrides,
})

const validEvidence = (
  overrides: Partial<FlashDecisionEvidence> = {},
): FlashDecisionEvidence => ({
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

  ...overrides,
})

const context = (
  overrides: Partial<FlashDecisionAdapterContext> = {},
): FlashDecisionAdapterContext => ({
  flash: validFlash(),
  sources: [validSource()],
  evidence: validEvidence(),
  ...overrides,
})

describe('Flash decision input adapter', () => {
  it('construiește un input eligibil AUTO', () => {
    const input = buildFlashDecisionInput(context())

    expect(evaluateFlashDecision(input)).toEqual({
      decision: 'autoPublish',
      reasons: ['auto_publish_gates_passed'],
    })
  })

  it('nu permite AUTO unei surse restricted', () => {
    const input = buildFlashDecisionInput(
      context({
        sources: [
          validSource({
            editorialTrust: 'restricted',
          }),
        ],
      }),
    )

    expect(evaluateFlashDecision(input)).toEqual({
      decision: 'review',
      reasons: ['source_auto_publish_disabled'],
    })
  })

  it('sursa cu ingestion dezactivat nu poate intra în AUTO', () => {
    const input = buildFlashDecisionInput(
      context({
        sources: [
          validSource({
            allowIngestion: false,
          }),
        ],
      }),
    )

    expect(evaluateFlashDecision(input)).toEqual({
      decision: 'review',
      reasons: ['source_auto_publish_disabled'],
    })
  })

  it('nu permite AUTO fără surse', () => {
    const input = buildFlashDecisionInput(
      context({ sources: [] }),
    )

    const result = evaluateFlashDecision(input)

    expect(result.decision).toBe('review')
    expect(result.reasons).toContain(
      'sources_not_validated',
    )
  })

  it('verificarea externă a sursei trebuie să treacă', () => {
    const input = buildFlashDecisionInput(
      context({
        evidence: validEvidence({
          sourceVerificationPassed: false,
        }),
      }),
    )

    expect(
      evaluateFlashDecision(input).reasons,
    ).toContain('sources_not_validated')
  })

  it('Flash medical cere disclaimer-ele medicale de bază', () => {
    expect(
      getRequiredDisclaimerTypes(
        validFlash({
          isHealthRelated: true,
        }),
        {
          regulatoryStatusUnclear: false,
        },
      ),
    ).toEqual([
      'medicalInformational',
      'specialistDecision',
    ])
  })

  it('Flash medical fără disclaimer-ele obligatorii merge la REVIEW', () => {
    const input = buildFlashDecisionInput(
      context({
        flash: validFlash({
          isHealthRelated: true,
          disclaimerTypes: [],
        }),
      }),
    )

    expect(
      evaluateFlashDecision(input).reasons,
    ).toContain('required_disclaimers_missing')
  })

  it('Flash medical poate trece când disclaimer-ele necesare există', () => {
    const input = buildFlashDecisionInput(
      context({
        flash: validFlash({
          isHealthRelated: true,
          disclaimerTypes: [
            'medicalInformational',
            'specialistDecision',
          ],
        }),
      }),
    )

    expect(evaluateFlashDecision(input).decision)
      .toBe('autoPublish')
  })

  it('emerging cere disclaimer de dovezi emergente', () => {
    const required = getRequiredDisclaimerTypes(
      validFlash({
        informationStatus: 'emerging',
      }),
      {
        regulatoryStatusUnclear: false,
      },
    )

    expect(required).toContain('emergingEvidence')
  })

  it('validarea clinică limitată cere disclaimer specific', () => {
    const required = getRequiredDisclaimerTypes(
      validFlash({
        isHealthRelated: true,
        clinicalValidationStatus: 'limitedEvidence',
      }),
      {
        regulatoryStatusUnclear: false,
      },
    )

    expect(required).toContain(
      'notClinicallyValidated',
    )
  })

  it('statutul regulator neclar cere disclaimer și REVIEW', () => {
    const input = buildFlashDecisionInput(
      context({
        flash: validFlash({
          disclaimerTypes: [
            'regulatoryStatusLimitedOrUnclear',
          ],
        }),
        evidence: validEvidence({
          regulatoryStatusUnclear: true,
        }),
      }),
    )

    const result = evaluateFlashDecision(input)

    expect(result.decision).toBe('review')
    expect(result.reasons).toContain(
      'regulatory_status_unclear',
    )
  })

  it('gate-urile BLOCK din evidence rămân prioritare', () => {
    const input = buildFlashDecisionInput(
      context({
        evidence: validEvidence({
          individualDiagnosis: true,
          engineCertain: false,
        }),
      }),
    )

    expect(evaluateFlashDecision(input)).toEqual({
      decision: 'blocked',
      reasons: ['individual_diagnosis'],
    })
  })
})
