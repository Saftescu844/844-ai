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
