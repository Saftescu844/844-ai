import type {
  Payload,
} from 'payload'

import {
  evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly,
  type FlashPayloadProducedFactualRuntimeInput,
  type FlashPayloadProducedFactualRuntimeResult,
} from '../semanticEvidence/payloadProducedFactualRuntimeReadOnly'

import {
  runFlashEngineEvaluationWithAuditPersistence,
  type RunFlashEngineEvaluationWithAuditPersistenceResult,
} from './runFlashEngineEvaluationWithAuditPersistence'

type ProducedFactualRuntimeParameters =
  Omit<
    FlashPayloadProducedFactualRuntimeInput,
    | 'payload'
    | 'flashId'
    | 'runId'
  >

export type FlashPayloadProducedFactualRuntimeWithAuditPersistenceInput =
  ProducedFactualRuntimeParameters & {
    /**
     * Payload complet deoarece același apel:
     * - citește Flash/Surse prin runtime-ul existent;
     * - scrie exclusiv FlashEngineRuns prin audit writer.
     */
    payload:
      Payload

    flashId:
      number

    runId:
      string

    provider:
      string

    model:
      string

    engineVersion:
      string

    startedAt?:
      string

    completedAt?:
      string
  }

export type FlashPayloadProducedFactualRuntimeWithAuditPersistenceResult =
  RunFlashEngineEvaluationWithAuditPersistenceResult<
    FlashPayloadProducedFactualRuntimeResult
  >

/**
 * Prima legătură write-capable dintre runtime-ul factual
 * existent și jurnalul persistent FlashEngineRuns.
 *
 * Runtime-ul factual rămâne neschimbat și read-only.
 * Singurele write-uri sunt cele efectuate de coordinator
 * prin writer-ul FlashEngineRuns.
 *
 * Nu:
 * - modifică FlashAI;
 * - schimbă editorialStatus;
 * - schimbă automationDecision;
 * - publică;
 * - citește chei API;
 * - creează clienți provider;
 * - apelează publisher-ul legacy.
 */
export async function evaluateFlashRuntimeWithProducedFactualEvidenceAndAuditPersistence(
  input:
    FlashPayloadProducedFactualRuntimeWithAuditPersistenceInput,
): Promise<
  FlashPayloadProducedFactualRuntimeWithAuditPersistenceResult
> {
  const {
    payload,
    flashId,
    runId,
    provider,
    model,
    engineVersion,
    startedAt,
    completedAt,
    ...runtimeParameters
  } = input

  return await runFlashEngineEvaluationWithAuditPersistence({
    payload,

    audit: {
      flashId,
      runId,
      provider,
      model,
      engineVersion,

      ...(startedAt ===
      undefined
        ? {}
        : {
            startedAt,
          }),

      ...(completedAt ===
      undefined
        ? {}
        : {
            completedAt,
          }),
    },

    evaluate:
      async () =>
        await evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly({
          ...runtimeParameters,

          payload,
          flashId,
          runId,
        }),
  })
}
