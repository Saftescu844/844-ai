export type FlashInformationStatus =
  | 'official'
  | 'confirmed'
  | 'emerging'
  | 'preliminary'
  | 'disputed'
  | 'unverified'

export type FlashRiskLevel =
  | 'low'
  | 'medium'
  | 'high'

export type FlashAutomationDecision =
  | 'autoPublish'
  | 'review'
  | 'blocked'

export type FlashDecisionReason =
  // AUTO
  | 'auto_publish_gates_passed'

  // BLOCK
  | 'information_unverified'
  | 'obvious_duplicate'
  | 'unverifiable_sources'
  | 'fabricated_information'
  | 'fabricated_citations'
  | 'individual_diagnosis'
  | 'individual_treatment_recommendation'
  | 'medication_change'
  | 'dangerous_instructions'
  | 'fundamental_editorial_violation'

  // REVIEW
  | 'missing_ro_version'
  | 'missing_en_version'
  | 'dedup_not_passed'
  | 'sources_not_validated'
  | 'facts_not_supported'
  | 'material_contradictions'
  | 'risk_medium'
  | 'risk_high'
  | 'information_disputed'
  | 'source_auto_publish_disabled'
  | 'required_disclaimers_missing'
  | 'safety_gate_triggered'
  | 'important_medical_interpretation'
  | 'extraordinary_claim'
  | 'regulatory_status_unclear'
  | 'engine_uncertain'

export interface FlashDecisionInput {
  informationStatus: FlashInformationStatus
  riskLevel: FlashRiskLevel

  roComplete: boolean
  enComplete: boolean

  dedupPassed: boolean
  sourcesValid: boolean
  factsSupportedBySources: boolean
  materialContradictions: boolean

  sourceAllowsAutoPublish: boolean
  requiredDisclaimersApplied: boolean
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

export interface FlashDecisionResult {
  decision: FlashAutomationDecision
  reasons: FlashDecisionReason[]
}

export function evaluateFlashDecision(
  input: FlashDecisionInput,
): FlashDecisionResult {
  const blockedReasons: FlashDecisionReason[] = []

  if (input.informationStatus === 'unverified') {
    blockedReasons.push('information_unverified')
  }

  if (input.obviousDuplicate) {
    blockedReasons.push('obvious_duplicate')
  }

  if (input.unverifiableSources) {
    blockedReasons.push('unverifiable_sources')
  }

  if (input.fabricatedInformation) {
    blockedReasons.push('fabricated_information')
  }

  if (input.fabricatedCitations) {
    blockedReasons.push('fabricated_citations')
  }

  if (input.individualDiagnosis) {
    blockedReasons.push('individual_diagnosis')
  }

  if (input.individualTreatmentRecommendation) {
    blockedReasons.push(
      'individual_treatment_recommendation',
    )
  }

  if (input.medicationChange) {
    blockedReasons.push('medication_change')
  }

  if (input.dangerousInstructions) {
    blockedReasons.push('dangerous_instructions')
  }

  if (input.fundamentalEditorialViolation) {
    blockedReasons.push(
      'fundamental_editorial_violation',
    )
  }

  if (blockedReasons.length > 0) {
    return {
      decision: 'blocked',
      reasons: blockedReasons,
    }
  }

  const reviewReasons: FlashDecisionReason[] = []

  if (!input.roComplete) {
    reviewReasons.push('missing_ro_version')
  }

  if (!input.enComplete) {
    reviewReasons.push('missing_en_version')
  }

  if (!input.dedupPassed) {
    reviewReasons.push('dedup_not_passed')
  }

  if (!input.sourcesValid) {
    reviewReasons.push('sources_not_validated')
  }

  if (!input.factsSupportedBySources) {
    reviewReasons.push('facts_not_supported')
  }

  if (input.materialContradictions) {
    reviewReasons.push('material_contradictions')
  }

  if (input.riskLevel === 'medium') {
    reviewReasons.push('risk_medium')
  }

  if (input.riskLevel === 'high') {
    reviewReasons.push('risk_high')
  }

  if (input.informationStatus === 'disputed') {
    reviewReasons.push('information_disputed')
  }

  if (!input.sourceAllowsAutoPublish) {
    reviewReasons.push(
      'source_auto_publish_disabled',
    )
  }

  if (!input.requiredDisclaimersApplied) {
    reviewReasons.push(
      'required_disclaimers_missing',
    )
  }

  if (input.safetyGateTriggered) {
    reviewReasons.push('safety_gate_triggered')
  }

  if (input.importantMedicalInterpretation) {
    reviewReasons.push(
      'important_medical_interpretation',
    )
  }

  if (input.extraordinaryClaimNeedsReview) {
    reviewReasons.push('extraordinary_claim')
  }

  if (input.regulatoryStatusUnclear) {
    reviewReasons.push(
      'regulatory_status_unclear',
    )
  }

  if (!input.engineCertain) {
    reviewReasons.push('engine_uncertain')
  }

  if (reviewReasons.length > 0) {
    return {
      decision: 'review',
      reasons: reviewReasons,
    }
  }

  return {
    decision: 'autoPublish',
    reasons: ['auto_publish_gates_passed'],
  }
}
