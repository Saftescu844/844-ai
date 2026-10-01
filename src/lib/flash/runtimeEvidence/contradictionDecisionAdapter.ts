import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashContradictions,
  type FlashContradictionEvidence,
  type FlashContradictionEvidenceInput,
} from './contradictionEvidence'

export type FlashContradictionDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    'materialContradictions'
  >

export interface FlashContradictionDecisionAdapterResult {
  contradictionEvidence:
    FlashContradictionEvidence

  decisionEvidence:
    FlashContradictionDecisionEvidence
}

export function toFlashContradictionDecisionEvidence(
  contradictionEvidence:
    FlashContradictionEvidence,
): FlashContradictionDecisionEvidence {
  return {
    materialContradictions:
      contradictionEvidence
        .materialContradictions,
  }
}

export function buildFlashContradictionDecisionEvidence(
  input: FlashContradictionEvidenceInput,
): FlashContradictionDecisionAdapterResult {
  const contradictionEvidence =
    evaluateFlashContradictions(input)

  return {
    contradictionEvidence,
    decisionEvidence:
      toFlashContradictionDecisionEvidence(
        contradictionEvidence,
      ),
  }
}
