import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashExtraordinaryClaims,
  type FlashExtraordinaryClaimEvidence,
  type FlashExtraordinaryClaimEvidenceInput,
} from './extraordinaryClaimEvidence'

export type FlashExtraordinaryClaimDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    'extraordinaryClaimNeedsReview'
  >

export interface FlashExtraordinaryClaimDecisionAdapterResult {
  extraordinaryClaimEvidence:
    FlashExtraordinaryClaimEvidence

  decisionEvidence:
    FlashExtraordinaryClaimDecisionEvidence
}

export function toFlashExtraordinaryClaimDecisionEvidence(
  extraordinaryClaimEvidence:
    FlashExtraordinaryClaimEvidence,
): FlashExtraordinaryClaimDecisionEvidence {
  return {
    extraordinaryClaimNeedsReview:
      extraordinaryClaimEvidence
        .extraordinaryClaimNeedsReview,
  }
}

export function buildFlashExtraordinaryClaimDecisionEvidence(
  input:
    FlashExtraordinaryClaimEvidenceInput,
): FlashExtraordinaryClaimDecisionAdapterResult {
  const extraordinaryClaimEvidence =
    evaluateFlashExtraordinaryClaims(
      input,
    )

  return {
    extraordinaryClaimEvidence,

    decisionEvidence:
      toFlashExtraordinaryClaimDecisionEvidence(
        extraordinaryClaimEvidence,
      ),
  }
}
