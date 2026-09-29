import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  classifyFlashProducerFailureRecovery,
} from '@/lib/flash/resilience/classifyProducerFailureRecovery'

describe(
  'Flash producer recovery disposition',
  () => {
    it.each([
      'provider_error',
      'provider_structured_output_invalid_json',
      'provider_structured_output_incomplete_json',
      'provider_structured_output_non_json',
      'provider_structured_output_multiple_text_blocks',
      'execution_error',
    ] as const)(
      'requires manual assessment for %s',
      reason => {
        expect(
          classifyFlashProducerFailureRecovery(
            reason,
          ),
        ).toBe(
          'manualAssessment',
        )
      },
    )

    it.each([
      'invalid_input',
      'configuration_error',
      'provider_output_truncated',
      'provider_refusal',
      'invalid_output',
      'invalid_output_json',
      'invalid_output_shape',
      'invalid_output_language',
      'invalid_output_title',
      'invalid_output_paragraphs',
      'invalid_output_too_short',
      'invalid_output_too_long',
      'invalid_output_quality_review_retention',
    ] as const)(
      'does not recommend repeating the same request for %s',
      reason => {
        expect(
          classifyFlashProducerFailureRecovery(
            reason,
          ),
        ).toBe(
          'doNotRetry',
        )
      },
    )
  },
)
