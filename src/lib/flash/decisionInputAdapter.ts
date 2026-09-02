import type {
  FlashDecisionInput,
  FlashInformationStatus,
  FlashRiskLevel,
} from './decisionEngine'

export type FlashDisclaimerType =
  | 'medicalInformational'
  | 'emergingEvidence'
  | 'notClinicallyValidated'
  | 'regulatoryStatusLimitedOrUnclear'
  | 'specialistDecision'

export type FlashClinicalValidationStatus =
  | 'notApplicable'
  | 'notValidated'
  | 'underEvaluation'
  | 'limitedEvidence'
  | 'validatedForSpecificUse'
  | 'authorizedOrApproved'
  | 'unclear'

export type FlashEditorialTrust =
  | 'high'
  | 'standard'
  | 'restricted'

export interface FlashDecisionRecord {
  informationStatus: FlashInformationStatus
  riskLevel: FlashRiskLevel
  isHealthRelated: boolean
  clinicalValidationStatus?: FlashClinicalValidationStatus | null
  disclaimerTypes?: FlashDisclaimerType[] | null
}

export interface FlashDecisionSource {
  registered: boolean
  active: boolean
  hasConcreteURL: boolean
  allowIngestion: boolean
  allowAutoPublish: boolean
  editorialTrust: FlashEditorialTrust
}

export interface FlashDecisionEvidence {
  roComplete: boolean
  enComplete: boolean

  dedupPassed: boolean
  sourceVerificationPassed: boolean
  factsSupportedBySources: boolean
  materialContradictions: boolean
  engineCertain: boolean

  safetyGateTriggered: boolean
  importantMedicalInterpretation: boolean
  extraordinaryClaimNeedsReview: boolean
  regulatoryStatusUnclear: boolean

  obviousDuplicate: boolean
  unverifiableSources: boolean
  fabricatedInformation: boolean
  fabricatedCitations: boolean

  individualDiagnosis: boolean
  individualTreatmentRecommendation: boolean
  medicationChange: boolean
  dangerousInstructions: boolean
  fundamentalEditorialViolation: boolean
}

export interface FlashDecisionAdapterContext {
  flash: FlashDecisionRecord
  sources: FlashDecisionSource[]
  evidence: FlashDecisionEvidence
}

export function getRequiredDisclaimerTypes(
  flash: FlashDecisionRecord,
  evidence: Pick<
    FlashDecisionEvidence,
    'regulatoryStatusUnclear'
  >,
): FlashDisclaimerType[] {
  const required = new Set<FlashDisclaimerType>()

  if (flash.isHealthRelated) {
    required.add('medicalInformational')
    required.add('specialistDecision')
  }

  if (
    flash.informationStatus === 'emerging' ||
    flash.informationStatus === 'preliminary'
  ) {
    required.add('emergingEvidence')
  }

  if (
    flash.isHealthRelated &&
    (
      flash.clinicalValidationStatus === 'notValidated' ||
      flash.clinicalValidationStatus === 'underEvaluation' ||
      flash.clinicalValidationStatus === 'limitedEvidence'
    )
  ) {
    required.add('notClinicallyValidated')
  }

  if (evidence.regulatoryStatusUnclear) {
    required.add('regulatoryStatusLimitedOrUnclear')
  }

  return [...required]
}

export function buildFlashDecisionInput({
  flash,
  sources,
  evidence,
}: FlashDecisionAdapterContext): FlashDecisionInput {
  const sourceStructureValid =
    sources.length > 0 &&
    sources.every(
      (source) =>
        source.registered &&
        source.active &&
        source.hasConcreteURL,
    )

  const sourceAllowsAutoPublish =
    sourceStructureValid &&
    sources.every(
      (source) =>
        source.allowIngestion &&
        source.allowAutoPublish &&
        source.editorialTrust !== 'restricted',
    )

  const requiredDisclaimers = getRequiredDisclaimerTypes(
    flash,
    evidence,
  )

  const appliedDisclaimers =
    new Set(flash.disclaimerTypes ?? [])

  const requiredDisclaimersApplied =
    requiredDisclaimers.every((type) =>
      appliedDisclaimers.has(type),
    )

  return {
    informationStatus: flash.informationStatus,
    riskLevel: flash.riskLevel,

    roComplete: evidence.roComplete,
    enComplete: evidence.enComplete,

    dedupPassed: evidence.dedupPassed,

    sourcesValid:
      sourceStructureValid &&
      evidence.sourceVerificationPassed,

    factsSupportedBySources:
      evidence.factsSupportedBySources,

    materialContradictions:
      evidence.materialContradictions,

    sourceAllowsAutoPublish,
    requiredDisclaimersApplied,
    engineCertain: evidence.engineCertain,

    safetyGateTriggered:
      evidence.safetyGateTriggered,

    importantMedicalInterpretation:
      evidence.importantMedicalInterpretation,

    extraordinaryClaimNeedsReview:
      evidence.extraordinaryClaimNeedsReview,

    regulatoryStatusUnclear:
      evidence.regulatoryStatusUnclear,

    obviousDuplicate: evidence.obviousDuplicate,
    unverifiableSources: evidence.unverifiableSources,

    fabricatedInformation:
      evidence.fabricatedInformation,

    fabricatedCitations:
      evidence.fabricatedCitations,

    individualDiagnosis:
      evidence.individualDiagnosis,

    individualTreatmentRecommendation:
      evidence.individualTreatmentRecommendation,

    medicationChange:
      evidence.medicationChange,

    dangerousInstructions:
      evidence.dangerousInstructions,

    fundamentalEditorialViolation:
      evidence.fundamentalEditorialViolation,
  }
}
