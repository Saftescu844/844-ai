import type {
  FlashSemanticEvidenceProducerFailureReason,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

export type FlashProducerRecoveryDisposition =
  | 'doNotRetry'
  | 'manualAssessment'

/**
 * Clasificare conservatoare pentru recovery.
 *
 * Important:
 * - NU autorizează retry automat;
 * - NU execută requeue;
 * - NU schimbă decizia editorială;
 * - răspunde doar la întrebarea:
 *   "putem spune sigur că repetarea aceleiași cereri are sens?"
 *
 * Cu semnalul actual, niciun failure reason nu este suficient
 * pentru auto-retry.
 */
export function classifyFlashProducerFailureRecovery(
  reason:
    FlashSemanticEvidenceProducerFailureReason,
): FlashProducerRecoveryDisposition {
  switch (reason) {
    case 'provider_error':
    case 'provider_structured_output_invalid_json':
    case 'provider_structured_output_incomplete_json':
    case 'provider_structured_output_non_json':
    case 'provider_structured_output_multiple_text_blocks':
    case 'execution_error':
      return 'manualAssessment'

    case 'invalid_input':
    case 'configuration_error':
    case 'provider_output_truncated':
    case 'provider_refusal':
    case 'invalid_output':
    case 'invalid_output_json':
    case 'invalid_output_shape':
    case 'invalid_output_language':
    case 'invalid_output_title':
    case 'invalid_output_paragraphs':
    case 'invalid_output_too_short':
    case 'invalid_output_too_long':
    case 'invalid_output_quality_review_retention':
      return 'doNotRetry'
  }
}
