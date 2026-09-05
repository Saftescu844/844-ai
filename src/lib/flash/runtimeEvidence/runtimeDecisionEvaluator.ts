import {
  buildFlashDecisionInput,
  type FlashDecisionRecord,
  type FlashDecisionSource,
} from '../decisionInputAdapter'

import {
  evaluateFlashDecision,
  type FlashDecisionInput,
  type FlashDecisionResult,
} from '../decisionEngine'

import {
  aggregateFlashRuntimeEvidence,
  type FlashRuntimeEvidenceAggregatorInput,
  type FlashRuntimeEvidenceAggregatorResult,
} from './runtimeEvidenceAggregator'

export interface FlashRuntimeDecisionEvaluatorInput {
  flash:
    FlashDecisionRecord

  sources:
    FlashDecisionSource[]

  runtimeEvidence:
    FlashRuntimeEvidenceAggregatorInput
}

export interface FlashRuntimeDecisionEvaluatorResult {
  aggregatedEvidence:
    FlashRuntimeEvidenceAggregatorResult

  decisionInput:
    FlashDecisionInput

  decision:
    FlashDecisionResult
}

/**
 * Evaluator final pur pentru un Flash.
 *
 * Nu citește Payload.
 * Nu face requesturi HTTP.
 * Nu scrie în DB.
 * Nu publică.
 *
 * Primește dovezile deja produse de componentele
 * runtime, le agregă și aplică exact contractul
 * existent al Decision Engine.
 */
export function evaluateFlashRuntimeDecision(
  input:
    FlashRuntimeDecisionEvaluatorInput,
): FlashRuntimeDecisionEvaluatorResult {
  const aggregatedEvidence =
    aggregateFlashRuntimeEvidence(
      input.runtimeEvidence,
    )

  const decisionInput =
    buildFlashDecisionInput({
      flash:
        input.flash,

      sources:
        input.sources,

      evidence:
        aggregatedEvidence
          .decisionEvidence,
    })

  const decision =
    evaluateFlashDecision(
      decisionInput,
    )

  return {
    aggregatedEvidence,
    decisionInput,
    decision,
  }
}
