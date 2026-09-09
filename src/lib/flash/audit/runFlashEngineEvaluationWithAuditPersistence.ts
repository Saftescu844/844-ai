import type {
  FlashEngineRun,
} from '@/payload-types'

import {
  buildFlashEngineRunCompletedAuditProjection,
  type FlashEngineRunAuditProjectionInput,
} from './flashEngineRunAuditProjection'

import {
  completeFlashEngineRun,
  failFlashEngineRun,
  startFlashEngineRun,
  type FlashEngineRunWriterPayload,
} from './payloadFlashEngineRunWriter'

export interface FlashEngineEvaluationAuditMetadata {
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

export interface RunFlashEngineEvaluationWithAuditPersistenceInput<
  TResult extends
    FlashEngineRunAuditProjectionInput,
> {
  payload:
    FlashEngineRunWriterPayload

  audit:
    FlashEngineEvaluationAuditMetadata

  /**
   * Evaluator injectat explicit.
   *
   * Coordonatorul nu știe și nu decide dacă acesta
   * folosește Anthropic, mock-uri sau alt provider.
   */
  evaluate:
    () => Promise<TResult>
}

export interface RunFlashEngineEvaluationWithAuditPersistenceResult<
  TResult extends
    FlashEngineRunAuditProjectionInput,
> {
  evaluation:
    TResult

  auditRun:
    FlashEngineRun
}

async function failRunAndRethrow({
  payload,
  runRecordId,
  originalError,
  errorCode,
  sanitizedErrorMessage,
  completedAt,
}: {
  payload:
    FlashEngineRunWriterPayload

  runRecordId:
    number

  originalError:
    unknown

  errorCode:
    string

  sanitizedErrorMessage:
    string

  completedAt?:
    string
}): Promise<never> {
  try {
    await failFlashEngineRun({
      payload,
      runRecordId,
      errorCode,
      sanitizedErrorMessage,
      ...(completedAt === undefined
        ? {}
        : {
            completedAt,
          }),
    })
  } catch (
    auditPersistenceError
  ) {
    throw new AggregateError(
      [
        originalError,
        auditPersistenceError,
      ],
      'Flash Engine evaluation failed and its audit failure state could not be persisted.',
    )
  }

  throw originalError
}

/**
 * Coordonatorul write-capable pentru:
 *
 * start run
 *   -> evaluate
 *   -> project audit-safe result
 *   -> complete run
 *
 * Dacă evaluate() eșuează:
 *   -> failed run
 *   -> rethrow original error
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
export async function runFlashEngineEvaluationWithAuditPersistence<
  TResult extends
    FlashEngineRunAuditProjectionInput,
>({
  payload,
  audit,
  evaluate,
}: RunFlashEngineEvaluationWithAuditPersistenceInput<TResult>): Promise<
  RunFlashEngineEvaluationWithAuditPersistenceResult<TResult>
> {
  const startedRun =
    await startFlashEngineRun({
      payload,

      flashId:
        audit.flashId,

      runId:
        audit.runId,

      provider:
        audit.provider,

      model:
        audit.model,

      engineVersion:
        audit.engineVersion,

      ...(audit.startedAt ===
      undefined
        ? {}
        : {
            startedAt:
              audit.startedAt,
          }),
    })

  let evaluation:
    TResult

  try {
    evaluation =
      await evaluate()
  } catch (
    evaluationError
  ) {
    return await failRunAndRethrow({
      payload,

      runRecordId:
        startedRun.id,

      originalError:
        evaluationError,

      errorCode:
        'FLASH_RUNTIME_EVALUATION_FAILED',

      sanitizedErrorMessage:
        'Flash runtime evaluation failed.',

      completedAt:
        audit.completedAt,
    })
  }

  let projection:
    ReturnType<
      typeof buildFlashEngineRunCompletedAuditProjection
    >

  try {
    projection =
      buildFlashEngineRunCompletedAuditProjection(
        evaluation,
      )

    const completedRun =
      await completeFlashEngineRun({
        payload,

        runRecordId:
          startedRun.id,

        projection,

        ...(audit.completedAt ===
        undefined
          ? {}
          : {
              completedAt:
                audit.completedAt,
            }),
      })

    return {
      evaluation,
      auditRun:
        completedRun,
    }
  } catch (
    completionError
  ) {
    return await failRunAndRethrow({
      payload,

      runRecordId:
        startedRun.id,

      originalError:
        completionError,

      errorCode:
        'FLASH_RUNTIME_AUDIT_COMPLETION_FAILED',

      sanitizedErrorMessage:
        'Flash runtime audit completion failed.',

      completedAt:
        audit.completedAt,
    })
  }
}
