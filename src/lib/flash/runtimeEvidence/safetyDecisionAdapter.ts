import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashSafety,
  type FlashSafetyEvidence,
  type FlashSafetyEvidenceInput,
} from './safetyEvidence'

export type FlashSafetyDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    | 'safetyGateTriggered'
    | 'individualDiagnosis'
    | 'individualTreatmentRecommendation'
    | 'medicationChange'
    | 'dangerousInstructions'
    | 'fundamentalEditorialViolation'
  >

export interface FlashSafetyDecisionAdapterResult {
  safetyEvidence:
    FlashSafetyEvidence

  decisionEvidence:
    FlashSafetyDecisionEvidence
}

export function toFlashSafetyDecisionEvidence(
  safetyEvidence:
    FlashSafetyEvidence,
): FlashSafetyDecisionEvidence {
  return {
    safetyGateTriggered:
      safetyEvidence
        .safetyGateTriggered,

    individualDiagnosis:
      safetyEvidence
        .individualDiagnosis,

    individualTreatmentRecommendation:
      safetyEvidence
        .individualTreatmentRecommendation,

    medicationChange:
      safetyEvidence
        .medicationChange,

    dangerousInstructions:
      safetyEvidence
        .dangerousInstructions,

    fundamentalEditorialViolation:
      safetyEvidence
        .fundamentalEditorialViolation,
  }
}

export function buildFlashSafetyDecisionEvidence(
  input:
    FlashSafetyEvidenceInput,
): FlashSafetyDecisionAdapterResult {
  const safetyEvidence =
    evaluateFlashSafety(input)

  return {
    safetyEvidence,

    decisionEvidence:
      toFlashSafetyDecisionEvidence(
        safetyEvidence,
      ),
  }
}
