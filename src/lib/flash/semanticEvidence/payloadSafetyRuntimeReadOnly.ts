import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

import {
  evaluateFlashRuntimeByIdReadOnly,
  type FlashPayloadRuntimeDecisionOptions,
  type FlashPayloadRuntimeDecisionResult,
  type FlashRuntimeSemanticEvidenceInput,
} from '../runtimeEvidence/payloadRuntimeDecisionOrchestrator'

import type {
  FlashSafetyEvidenceInput,
} from '../runtimeEvidence/safetyEvidence'

import {
  buildFlashSemanticDocument,
  type FlashSemanticDocument,
} from './semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
  type FlashSemanticEvidenceProducer,
  type FlashSemanticEvidenceProducerResult,
} from './semanticEvidenceProducer'

type FlashPayloadReader =
  Pick<
    Payload,
    'findByID' | 'find'
  >

export type FlashRuntimeSemanticEvidenceWithoutSafety =
  Omit<
    FlashRuntimeSemanticEvidenceInput,
    'safety'
  >

export interface FlashPayloadSafetyRuntimeResult {
  semanticDocument:
    FlashSemanticDocument

  safetyProduction:
    FlashSemanticEvidenceProducerResult<
      FlashSafetyEvidenceInput
    >

  runtime:
    FlashPayloadRuntimeDecisionResult
}

/**
 * Wrapper read-only peste orchestratorul runtime
 * existent.
 *
 * Flux:
 *
 * Payload FlashAi
 *   -> SemanticDocument
 *   -> Safety Semantic Producer
 *   -> SafetyEvidenceInput
 *   -> evaluateFlashRuntimeByIdReadOnly()
 *
 * Important:
 * - orchestratorul existent rămâne neatins;
 * - producer failure => safety=null;
 * - failure NU devine PASS;
 * - nu scrie în Payload;
 * - nu publică;
 * - nu apelează publisher-ul legacy.
 */
export async function evaluateFlashRuntimeWithProducedSafetyByIdReadOnly({
  payload,
  flashId,
  runId,
  safetyProducer,
  semanticEvidence,
  options = {},
}: {
  payload:
    FlashPayloadReader

  flashId:
    number

  runId:
    string

  safetyProducer:
    FlashSemanticEvidenceProducer<
      FlashSafetyEvidenceInput
    >

  semanticEvidence:
    FlashRuntimeSemanticEvidenceWithoutSafety

  options?:
    FlashPayloadRuntimeDecisionOptions
}): Promise<
  FlashPayloadSafetyRuntimeResult
> {
  /**
   * Citire separată intenționată.
   *
   * Contextul Decision Engine nu expune documentul
   * editorial FlashAi complet, iar SemanticDocument
   * are nevoie de titlu/excerpt/conținut.
   *
   * Preferăm această citire read-only suplimentară
   * în locul modificării orchestratorului stabil.
   */
  const flash =
    await payload.findByID({
      collection:
        'flash-ai',

      id:
        flashId,

      depth:
        0,

      draft:
        true,

      overrideAccess:
        true,
    }) as FlashAi

  const semanticDocument =
    buildFlashSemanticDocument(
      flash,
    )

  const safetyProduction =
    await runFlashSemanticEvidenceProducer({
      producer:
        safetyProducer,

      input: {
        document:
          semanticDocument,

        runId,
      },
    })

  const runtime =
    await evaluateFlashRuntimeByIdReadOnly(
      payload,
      flashId,
      {
        ...semanticEvidence,

        /**
         * Un producer eșuat nu produce evidence.
         *
         * null => aggregatorul marchează Safety
         * drept componentă lipsă și păstrează
         * comportamentul conservator existent.
         */
        safety:
          safetyProduction.ok
            ? safetyProduction.evidence
            : null,
      },
      options,
    )

  return {
    semanticDocument,
    safetyProduction,
    runtime,
  }
}
