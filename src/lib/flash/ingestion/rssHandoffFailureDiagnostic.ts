import { isFlashRssArticleRedirectIdentityMismatch, isFlashRssArticleUnsupportedLayoutFailure, isFlashRssMicrosoftPaperEvidenceUnavailable } from './flashRssStageNextAttemptRunner'

/** Process facts only: never serialize the child Error, signal text or captured output. */
export function summarizeRssHandoffExit(result: {
  status: number | null
  signal: string | null
  error?: { code?: string }
  stdout: string
  stderr: string
}) {
  return {
    exitCode: Number.isInteger(result.status) && result.status !== null && result.status >= 0 && result.status <= 255
      ? result.status : null,
    signalled: Boolean(result.signal),
    processError: result.error ? result.error.code === 'ENOBUFS' ? 'output_limit' : 'execution_error' : null,
    stdoutBytes: Buffer.byteLength(result.stdout, 'utf8'),
    stderrBytes: Buffer.byteLength(result.stderr, 'utf8'),
    applicationFailureMarker: result.stderr.split(/\r?\n/).includes('FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_FAILED'),
    unsettledAwaitWarning: /^Warning: (?:Detected )?[Uu]nsettled top-level await(?: at .*)?$/m.test(result.stderr),
  }
}

/** Map captured child output to constants only. Never forward child text to logs. */
export function diagnoseRssHandoffFailure(output: string) {
  const reasons = [
    'invalid_input', 'configuration_error', 'provider_error', 'provider_output_truncated',
    'provider_refusal', 'provider_structured_output_invalid_json',
    'provider_structured_output_incomplete_json', 'provider_structured_output_non_json',
    'provider_structured_output_multiple_text_blocks', 'invalid_output',
    'invalid_output_json', 'invalid_output_shape', 'invalid_output_language',
    'invalid_output_title', 'invalid_output_paragraphs', 'invalid_output_too_short',
    'invalid_output_too_long', 'invalid_output_quality_review_retention', 'execution_error',
  ] as const
  const phases = [
    ['classification', 'Pre-persistence classification failed: '],
    ['editorial-generation', 'Pre-persistence editorial generation failed: '],
    ['editorial-quality-review', 'Pre-persistence editorial quality review failed: '],
  ] as const
  const bounded = output.slice(-16_000)
  if (isFlashRssArticleRedirectIdentityMismatch(bounded)) {
    return { phase: 'article-retrieval', reason: 'redirect_identity_mismatch' } as const
  }
  if (isFlashRssMicrosoftPaperEvidenceUnavailable(bounded)) {
    return { phase: 'article-extraction', reason: 'article_primary_evidence_unavailable' } as const
  }
  if (isFlashRssArticleUnsupportedLayoutFailure(bounded)) {
    return { phase: 'article-extraction', reason: 'article_layout_not_supported' } as const
  }
  if (bounded.split(/\r?\n/).includes('Pre-persistence editorial quality review failed closed: editorial_quality_review_retention_floor_breach.')) {
    return { phase: 'editorial-quality-review', reason: 'invalid_output_quality_review_retention' } as const
  }
  for (const line of bounded.split(/\r?\n/)) {
    for (const [phase, prefix] of phases) {
      for (const reason of reasons) {
        if (line === `${prefix}${reason}.` ||
          (phase === 'editorial-quality-review' && line.startsWith(`${prefix}${reason}. Diagnostics: `))) {
          return { phase, reason }
        }
      }
    }
  }
  return { phase: 'unknown', reason: 'unclassified' } as const
}

export type RssHandoffFailureDiagnostic = ReturnType<typeof diagnoseRssHandoffFailure>
