import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashSourceVerification,
  type FlashSourceVerificationCandidate,
  type FlashSourceVerificationEvidence,
} from './sourceVerificationEvidence'

export type FlashSourceVerificationDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    'sourceVerificationPassed'
  >

export interface FlashSourceVerificationDecisionAdapterResult {
  sourceVerification:
    FlashSourceVerificationEvidence

  decisionEvidence:
    FlashSourceVerificationDecisionEvidence
}

export function toFlashSourceVerificationDecisionEvidence(
  sourceVerification:
    FlashSourceVerificationEvidence,
): FlashSourceVerificationDecisionEvidence {
  return {
    sourceVerificationPassed:
      sourceVerification
        .sourceVerificationPassed,
  }
}

export function buildFlashSourceVerificationDecisionEvidence(
  sources: FlashSourceVerificationCandidate[],
): FlashSourceVerificationDecisionAdapterResult {
  const sourceVerification =
    evaluateFlashSourceVerification(
      sources,
    )

  return {
    sourceVerification,
    decisionEvidence:
      toFlashSourceVerificationDecisionEvidence(
        sourceVerification,
      ),
  }
}
