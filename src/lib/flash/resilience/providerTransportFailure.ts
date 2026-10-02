export type FlashProviderTransportFailureCategory =
  | 'timeout'
  | 'rateLimited'
  | 'serverError'
  | 'clientError'
  | 'networkError'
  | 'unknown'

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      'object' &&
    value !==
      null
  )
}

function finiteStatus(
  value:
    unknown,
): number | null {
  return (
    typeof value ===
      'number' &&
    Number.isInteger(
      value,
    ) &&
    value >=
      100 &&
    value <=
      599
  )
    ? value
    : null
}

function optionalString(
  value:
    unknown,
): string {
  return typeof value ===
    'string'
    ? value
        .trim()
        .toLowerCase()
    : ''
}

/**
 * Reduce o eroare brută de provider la o categorie bounded,
 * fără a păstra:
 * - message;
 * - response body;
 * - request IDs;
 * - headers;
 * - provider error codes brute.
 *
 * Clasificarea este structurală și provider-agnostică.
 */
export function classifyFlashProviderTransportFailure(
  error:
    unknown,
): FlashProviderTransportFailureCategory {
  if (
    !isRecord(
      error,
    )
  ) {
    return 'unknown'
  }

  const status =
    finiteStatus(
      error.status,
    )

  if (status === 408) {
    return 'timeout'
  }

  if (status === 429) {
    return 'rateLimited'
  }

  if (
    status !== null &&
    status >= 500
  ) {
    return 'serverError'
  }

  if (
    status !== null &&
    status >= 400
  ) {
    return 'clientError'
  }

  const name =
    optionalString(
      error.name,
    )

  if (
    name.includes(
      'timeout',
    )
  ) {
    return 'timeout'
  }

  if (
    name.includes(
      'connection',
    ) ||
    name.includes(
      'network',
    )
  ) {
    return 'networkError'
  }

  const code =
    optionalString(
      error.code,
    )

  if (
    code === 'etimedout' ||
    code === 'esockettimedout'
  ) {
    return 'timeout'
  }

  if (
    code === 'econnreset' ||
    code === 'econnrefused' ||
    code === 'enotfound' ||
    code === 'eai_again' ||
    code === 'enetunreach' ||
    code === 'ehostunreach'
  ) {
    return 'networkError'
  }

  return 'unknown'
}
