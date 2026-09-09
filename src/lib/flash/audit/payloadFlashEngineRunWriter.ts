import type {
  Payload,
} from 'payload'

import type {
  FlashEngineRun,
} from '@/payload-types'

import type {
  FlashEngineRunCompletedAuditProjection,
} from './flashEngineRunAuditProjection'

export type FlashEngineRunWriterPayload =
  Pick<
    Payload,
    | 'create'
    | 'update'
  >

export interface StartFlashEngineRunInput {
  payload:
    FlashEngineRunWriterPayload

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
}

export interface CompleteFlashEngineRunInput {
  payload:
    FlashEngineRunWriterPayload

  runRecordId:
    number

  projection:
    FlashEngineRunCompletedAuditProjection

  completedAt?:
    string
}

export interface FailFlashEngineRunInput {
  payload:
    FlashEngineRunWriterPayload

  runRecordId:
    number

  errorCode:
    string

  /**
   * Trebuie să fie un mesaj tehnic deja sanitizat,
   * fără chei, token-uri sau răspuns provider brut.
   */
  sanitizedErrorMessage?:
    string

  completedAt?:
    string
}

function nowIso(): string {
  return new Date()
    .toISOString()
}

/**
 * Payload JSON fields accept an index-signature object.
 *
 * Proiecțiile noastre sunt deja JSON-safe; aici doar
 * materializăm explicit un plain record pentru contractul
 * generat de Payload, fără cast la any și fără serializare.
 */
function toPayloadJsonObject(
  value:
    object,
): Record<string, unknown> {
  return {
    ...value,
  }
}

function requiredText(
  value:
    string,
  field:
    string,
): string {
  const normalized =
    value.trim()

  if (!normalized) {
    throw new Error(
      `Missing required ${field}`,
    )
  }

  return normalized
}

function positiveInteger(
  value:
    number,
  field:
    string,
): number {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 1
  ) {
    throw new Error(
      `Invalid ${field}: ${value}`,
    )
  }

  return value
}

/**
 * Creează înregistrarea tehnică a unui run înainte
 * de evaluarea Flash Engine.
 *
 * Acesta este un write intern controlat.
 * Accesul uman al colecției rămâne blocat.
 */
export async function startFlashEngineRun({
  payload,
  flashId,
  runId,
  provider,
  model,
  engineVersion,
  startedAt = nowIso(),
}: StartFlashEngineRunInput): Promise<
  FlashEngineRun
> {
  const normalizedFlashId =
    positiveInteger(
      flashId,
      'flashId',
    )

  return await payload.create({
    collection:
      'flash-engine-runs',

    data: {
      flash:
        normalizedFlashId,

      flashIdSnapshot:
        normalizedFlashId,

      runId:
        requiredText(
          runId,
          'runId',
        ),

      status:
        'running',

      provider:
        requiredText(
          provider,
          'provider',
        ),

      model:
        requiredText(
          model,
          'model',
        ),

      engineVersion:
        requiredText(
          engineVersion,
          'engineVersion',
        ),

      startedAt,
    },

    overrideAccess:
      true,
  })
}

/**
 * Finalizează un run pentru care evaluatorul a produs
 * rezultatul complet al orchestrării.
 *
 * Nu modifică Flash-ul editorial și nu publică.
 */
export async function completeFlashEngineRun({
  payload,
  runRecordId,
  projection,
  completedAt = nowIso(),
}: CompleteFlashEngineRunInput): Promise<
  FlashEngineRun
> {
  return await payload.update({
    collection:
      'flash-engine-runs',

    id:
      positiveInteger(
        runRecordId,
        'runRecordId',
      ),

    data: {
      status:
        'completed',

      completedAt,

      decision:
        projection.decision,

      reasons:
        projection.reasons,

      decisionInputSnapshot:
        toPayloadJsonObject(
          projection
            .decisionInputSnapshot,
        ),

      evidenceSummary:
        toPayloadJsonObject(
          projection
            .evidenceSummary,
        ),

      errorCode:
        null,

      errorMessage:
        null,
    },

    overrideAccess:
      true,
  })
}

/**
 * Marchează o execuție terminată prin eroare tehnică.
 *
 * Nu persistăm obiectul Error și nu acceptăm aici
 * răspunsuri brute ale providerului.
 */
export async function failFlashEngineRun({
  payload,
  runRecordId,
  errorCode,
  sanitizedErrorMessage,
  completedAt = nowIso(),
}: FailFlashEngineRunInput): Promise<
  FlashEngineRun
> {
  return await payload.update({
    collection:
      'flash-engine-runs',

    id:
      positiveInteger(
        runRecordId,
        'runRecordId',
      ),

    data: {
      status:
        'failed',

      completedAt,

      decision:
        null,

      reasons:
        [],

      decisionInputSnapshot:
        null,

      evidenceSummary:
        null,

      errorCode:
        requiredText(
          errorCode,
          'errorCode',
        ),

      errorMessage:
        sanitizedErrorMessage
          ?.trim()
          .slice(
            0,
            2000,
          ) ||
        null,
    },

    overrideAccess:
      true,
  })
}
