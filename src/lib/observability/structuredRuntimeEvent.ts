export type RuntimeEventLevel =
  | 'info'
  | 'error'

export type RuntimeEventStatus =
  | 'started'
  | 'success'
  | 'failed'
  | 'noop'

export type RuntimeEventDataValue =
  | string
  | number
  | boolean
  | null

export interface StructuredRuntimeEventInput {
  event:
    string

  component:
    string

  status:
    RuntimeEventStatus

  level?:
    RuntimeEventLevel

  correlationId?:
    string

  data?:
    Record<
      string,
      RuntimeEventDataValue | undefined
    >
}

export interface StructuredRuntimeEvent {
  schemaVersion:
    1

  timestamp:
    string

  level:
    RuntimeEventLevel

  event:
    string

  component:
    string

  status:
    RuntimeEventStatus

  correlationId?:
    string

  data?:
    Record<
      string,
      RuntimeEventDataValue
    >
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

function optionalText(
  value:
    string | undefined,
): string | undefined {
  const normalized =
    value?.trim()

  return normalized
    ? normalized
    : undefined
}

function compactData(
  data:
    StructuredRuntimeEventInput[
      'data'
    ],
): StructuredRuntimeEvent[
  'data'
] {
  if (!data) {
    return undefined
  }

  const entries =
    Object.entries(
      data,
    ).filter(
      (
        entry,
      ): entry is [
        string,
        RuntimeEventDataValue,
      ] =>
        entry[1] !==
          undefined,
    )

  return entries.length >
    0
    ? Object.fromEntries(
        entries,
      )
    : undefined
}

/**
 * Contract minimal pentru loguri runtime machine-readable.
 *
 * Intenționat:
 * - fără obiecte Error;
 * - fără body-uri provider;
 * - fără token-uri/secrete;
 * - fără payload-uri arbitrare/nested;
 * - correlationId rămâne opțional pentru evenimentele
 *   care apar înainte de alocarea unei execuții.
 */
export function buildStructuredRuntimeEvent(
  input:
    StructuredRuntimeEventInput,
  now:
    () => Date =
      () => new Date(),
): StructuredRuntimeEvent {
  const data =
    compactData(
      input.data,
    )

  const correlationId =
    optionalText(
      input.correlationId,
    )

  return {
    schemaVersion:
      1,

    timestamp:
      now()
        .toISOString(),

    level:
      input.level ??
      (
        input.status ===
          'failed'
          ? 'error'
          : 'info'
      ),

    event:
      requiredText(
        input.event,
        'event',
      ),

    component:
      requiredText(
        input.component,
        'component',
      ),

    status:
      input.status,

    ...(correlationId
      ? {
          correlationId,
        }
      : {}),

    ...(data
      ? {
          data,
        }
      : {}),
  }
}

export function serializeStructuredRuntimeEvent(
  input:
    StructuredRuntimeEventInput,
  now?:
    () => Date,
): string {
  return JSON.stringify(
    buildStructuredRuntimeEvent(
      input,
      now,
    ),
  )
}
