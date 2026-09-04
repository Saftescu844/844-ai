import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashMedicalInterpretation,
  type FlashMedicalInterpretationEvidence,
  type FlashMedicalInterpretationEvidenceInput,
} from './medicalInterpretationEvidence'

export type FlashMedicalInterpretationDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    'importantMedicalInterpretation'
  >

export interface FlashMedicalInterpretationDecisionAdapterResult {
  medicalInterpretationEvidence:
    FlashMedicalInterpretationEvidence

  decisionEvidence:
    FlashMedicalInterpretationDecisionEvidence
}

export function toFlashMedicalInterpretationDecisionEvidence(
  medicalInterpretationEvidence:
    FlashMedicalInterpretationEvidence,
): FlashMedicalInterpretationDecisionEvidence {
  return {
    importantMedicalInterpretation:
      medicalInterpretationEvidence
        .importantMedicalInterpretation,
  }
}

export function buildFlashMedicalInterpretationDecisionEvidence(
  input:
    FlashMedicalInterpretationEvidenceInput,
): FlashMedicalInterpretationDecisionAdapterResult {
  const medicalInterpretationEvidence =
    evaluateFlashMedicalInterpretation(
      input,
    )

  return {
    medicalInterpretationEvidence,

    decisionEvidence:
      toFlashMedicalInterpretationDecisionEvidence(
        medicalInterpretationEvidence,
      ),
  }
}
