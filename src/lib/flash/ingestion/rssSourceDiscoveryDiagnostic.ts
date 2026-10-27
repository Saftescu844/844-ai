export type RssSourceDiscoveryPhase = 'retrieval' | 'parsing'
export type RssSourceDiscoveryDiagnostic = {
  phase: RssSourceDiscoveryPhase
  reason: 'http_error' | 'timeout' | 'redirect_outside_source' | 'size_limit' | 'parse_error' | 'retrieval_error'
  httpStatus: number | null
}

/** Fixed categories only: never retain exception text, URLs, headers or bodies. */
export function diagnoseRssSourceDiscoveryFailure(
  error: unknown,
  phase: RssSourceDiscoveryPhase,
): RssSourceDiscoveryDiagnostic {
  if (phase === 'parsing') return { phase, reason: 'parse_error', httpStatus: null }
  const message = error instanceof Error ? error.message : ''
  const http = /^RSS retrieval failed with HTTP ([45]\d{2})\.$/.exec(message)
  if (http) return { phase, reason: 'http_error', httpStatus: Number(http[1]) }
  const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout'
    : message === 'RSS retrieval redirected outside the registered source host.' ? 'redirect_outside_source'
      : message === 'RSS feed exceeds the configured size limit.' ? 'size_limit'
        : 'retrieval_error'
  return { phase, reason, httpStatus: null }
}
