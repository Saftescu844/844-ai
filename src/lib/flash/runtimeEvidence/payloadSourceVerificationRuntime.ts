import type { Payload } from 'payload'

import {
  buildFlashSourceRetrievalPlanReadOnly,
  type FlashSourceRetrievalPlan,
} from './payloadSourceRetrievalPlan'

import type {
  FlashSourceVerificationDecisionEvidence,
} from './sourceVerificationDecisionAdapter'

import {
  runFlashSourceVerificationRuntimePipeline,
  type FlashSourceVerificationRuntimePipelineResult,
} from './sourceVerificationRuntimePipeline'

import type {
  FlashSourceRetrieverOptions,
} from './sourceRetriever'

type FlashPayloadReader =
  Pick<Payload, 'findByID' | 'find'>

export type FlashSourceVerificationCoverage =
  | 'notRun'
  | 'partial'
  | 'complete'

export interface FlashPayloadSourceVerificationRuntimeResult {
  plan:
    FlashSourceRetrievalPlan

  verificationCoverage:
    FlashSourceVerificationCoverage

  /**
   * Rezultatul pentru sursele pe care politica
   * registrului ne-a permis efectiv să le retragem.
   *
   * Poate exista și pentru coverage=partial.
   */
  verification:
    FlashSourceVerificationRuntimePipelineResult | null

  /**
   * Poate fi folosit de Decision Engine numai
   * când TOATE rândurile Flash au fost eligibile
   * pentru retrieval.
   *
   * Pentru notRun / partial rămâne null,
   * astfel încât să nu prezentăm o verificare
   * incompletă drept sourceVerificationPassed.
   */
  completeDecisionEvidence:
    FlashSourceVerificationDecisionEvidence | null
}

/**
 * Payload este folosit exclusiv read-only.
 *
 * Funcția poate face requesturi HTTP pentru
 * sursele marcate de plan cu action=retrieve,
 * dar NU face Payload writes și NU publică nimic.
 */
export async function runFlashSourceVerificationFromPayloadReadOnly(
  payload:
    FlashPayloadReader,
  flashId: number,
  options:
    FlashSourceRetrieverOptions = {},
): Promise<FlashPayloadSourceVerificationRuntimeResult> {
  const plan =
    await buildFlashSourceRetrievalPlanReadOnly(
      payload,
      flashId,
    )

  const retrievalInputs =
    plan.items.flatMap(
      item =>
        item.action === 'retrieve' &&
        item.retrievalInput
          ? [
              item.retrievalInput,
            ]
          : [],
    )

  if (
    retrievalInputs.length === 0
  ) {
    return {
      plan,
      verificationCoverage:
        'notRun',
      verification: null,
      completeDecisionEvidence:
        null,
    }
  }

  const verification =
    await runFlashSourceVerificationRuntimePipeline(
      retrievalInputs,
      options,
    )

  const verificationCoverage:
    FlashSourceVerificationCoverage =
      plan.retrieveCount ===
      plan.totalRows
        ? 'complete'
        : 'partial'

  return {
    plan,
    verificationCoverage,
    verification,

    completeDecisionEvidence:
      verificationCoverage ===
      'complete'
        ? verification
            .decisionEvidence
        : null,
  }
}
