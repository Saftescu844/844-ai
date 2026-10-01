import type { Payload } from 'payload'

import {
  buildFlashDecisionInput,
  type FlashDecisionEvidence,
} from './decisionInputAdapter'

import {
  evaluateFlashDecision,
  type FlashDecisionResult,
} from './decisionEngine'

import {
  loadFlashDecisionContextByIdReadOnly,
} from './payloadDecisionContextReadOnly'

export type FlashRuntimeEvidence =
  Omit<
    FlashDecisionEvidence,
    'roComplete' | 'enComplete'
  >

export interface FlashReadOnlyEvaluation {
  flashId: number
  roComplete: boolean
  enComplete: boolean
  sourceCount: number
  result:
    FlashDecisionResult
}

type FlashPayloadReader =
  Pick<
    Payload,
    'findByID' | 'find'
  >

/**
 * Evaluator Payload legacy/read-only.
 *
 * Păstrăm API-ul existent pentru compatibilitate,
 * dar contextul Payload este încărcat prin loader-ul
 * reutilizabil folosit și de noul runtime.
 */
export async function evaluateFlashByIdReadOnly(
  payload:
    FlashPayloadReader,
  flashId:
    number,
  evidence:
    FlashRuntimeEvidence,
): Promise<FlashReadOnlyEvaluation> {
  const context =
    await loadFlashDecisionContextByIdReadOnly(
      payload,
      flashId,
    )

  const input =
    buildFlashDecisionInput({
      flash:
        context.flash,

      sources:
        context.sources,

      evidence: {
        ...evidence,
        ...context
          .pairCompleteness,
      },
    })

  return {
    flashId:
      context.flashId,

    ...context
      .pairCompleteness,

    sourceCount:
      context.sourceCount,

    result:
      evaluateFlashDecision(
        input,
      ),
  }
}
