import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashRegulatoryStatus,
  type FlashRegulatoryStatusEvidence,
  type FlashRegulatoryStatusEvidenceInput,
} from './regulatoryStatusEvidence'

export type FlashRegulatoryStatusDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    'regulatoryStatusUnclear'
  >

export interface FlashRegulatoryStatusDecisionAdapterResult {
  regulatoryStatusEvidence:
    FlashRegulatoryStatusEvidence

  decisionEvidence:
    FlashRegulatoryStatusDecisionEvidence
}

export function toFlashRegulatoryStatusDecisionEvidence(
  regulatoryStatusEvidence:
    FlashRegulatoryStatusEvidence,
): FlashRegulatoryStatusDecisionEvidence {
  return {
    regulatoryStatusUnclear:
      regulatoryStatusEvidence
        .regulatoryStatusUnclear,
  }
}

export function buildFlashRegulatoryStatusDecisionEvidence(
  input:
    FlashRegulatoryStatusEvidenceInput,
): FlashRegulatoryStatusDecisionAdapterResult {
  const regulatoryStatusEvidence =
    evaluateFlashRegulatoryStatus(
      input,
    )

  return {
    regulatoryStatusEvidence,

    decisionEvidence:
      toFlashRegulatoryStatusDecisionEvidence(
        regulatoryStatusEvidence,
      ),
  }
}
