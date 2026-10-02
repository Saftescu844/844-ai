import type {
  FlashDecisionEvidence,
} from '../decisionInputAdapter'

import {
  evaluateFlashFactualSupport,
  type FlashFactualSupportEvidence,
  type FlashFactualSupportInput,
} from './factualSupportEvidence'

export type FlashFactualDecisionEvidence =
  Pick<
    FlashDecisionEvidence,
    | 'factsSupportedBySources'
    | 'fabricatedInformation'
    | 'fabricatedCitations'
  >

export interface FlashFactualDecisionAdapterResult {
  factualSupport: FlashFactualSupportEvidence
  decisionEvidence: FlashFactualDecisionEvidence
}

export function toFlashFactualDecisionEvidence(
  factualSupport: FlashFactualSupportEvidence,
): FlashFactualDecisionEvidence {
  return {
    factsSupportedBySources:
      factualSupport.factsSupportedBySources,

    fabricatedInformation:
      factualSupport.fabricatedInformation,

    fabricatedCitations:
      factualSupport.fabricatedCitations,
  }
}

export function buildFlashFactualDecisionEvidence(
  input: FlashFactualSupportInput,
): FlashFactualDecisionAdapterResult {
  const factualSupport =
    evaluateFlashFactualSupport(input)

  return {
    factualSupport,
    decisionEvidence:
      toFlashFactualDecisionEvidence(
        factualSupport,
      ),
  }
}
