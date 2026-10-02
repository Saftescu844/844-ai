import {
  evaluateFlashFactualSupport,
  type FlashFactualSupportEvidence,
} from './factualSupportEvidence'

import {
  toFlashFactualDecisionEvidence,
  type FlashFactualDecisionEvidence,
} from './factualSupportDecisionAdapter'

import {
  validateFlashFactualProvenance,
  type FlashFactualProvenanceInput,
  type FlashFactualProvenanceResult,
} from './factualSupportProvenance'

export interface FlashVerifiedFactualPipelineResult {
  provenance: FlashFactualProvenanceResult

  /**
   * Null înseamnă că provenance-ul nu a trecut
   * și claims nu au fost trimise mai departe.
   */
  factualSupport: FlashFactualSupportEvidence | null

  decisionEvidence: FlashFactualDecisionEvidence
}

const invalidProvenanceDecisionEvidence:
  FlashFactualDecisionEvidence = {
    factsSupportedBySources: false,
    fabricatedInformation: false,
    fabricatedCitations: false,
  }

export function buildFlashVerifiedFactualDecisionEvidence(
  input: FlashFactualProvenanceInput,
): FlashVerifiedFactualPipelineResult {
  const provenance =
    validateFlashFactualProvenance(
      input,
    )

  if (!provenance.valid) {
    return {
      provenance,
      factualSupport: null,
      decisionEvidence:
        invalidProvenanceDecisionEvidence,
    }
  }

  const factualSupport =
    evaluateFlashFactualSupport({
      claims:
        provenance.verifiedClaims,
    })

  return {
    provenance,
    factualSupport,
    decisionEvidence:
      toFlashFactualDecisionEvidence(
        factualSupport,
      ),
  }
}
