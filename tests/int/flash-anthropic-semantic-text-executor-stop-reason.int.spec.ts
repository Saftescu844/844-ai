import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  createAnthropicSemanticTextExecutor,
  type AnthropicSemanticTextClient,
} from '@/lib/flash/semanticEvidence/anthropicSemanticTextExecutor'

function clientWithStopReason(
  stopReason: string | null,
): AnthropicSemanticTextClient {
  return {
    messages: {
      create: async () => ({
        stop_reason:
          stopReason,
        content: [
          {
            type: 'text',
            text:
              '{"language":"ro"}',
          },
        ],
      }),
    },
  }
}

describe(
  'Anthropic semantic executor stop-reason diagnostics',
  () => {
    it(
      'accepts a normal completed response',
      async () => {
        const executor =
          createAnthropicSemanticTextExecutor({
            client:
              clientWithStopReason(
                'end_turn',
              ),
            model: 'claude-test',
          })

        await expect(
          executor({
            runId: 'test-end-turn',
            systemPrompt: 'system',
            userPrompt: 'user',
          }),
        ).resolves.toBe(
          '{"language":"ro"}',
        )
      },
    )

    it.each([
      'max_tokens',
      'model_context_window_exceeded',
    ])(
      'reports %s as provider_output_truncated',
      async stopReason => {
        const executor =
          createAnthropicSemanticTextExecutor({
            client:
              clientWithStopReason(
                stopReason,
              ),
            model: 'claude-test',
          })

        await expect(
          executor({
            runId: 'test-truncated',
            systemPrompt: 'system',
            userPrompt: 'user',
          }),
        ).rejects.toThrow(
          'provider_output_truncated',
        )
      },
    )

    it(
      'reports refusal explicitly',
      async () => {
        const executor =
          createAnthropicSemanticTextExecutor({
            client:
              clientWithStopReason(
                'refusal',
              ),
            model: 'claude-test',
          })

        await expect(
          executor({
            runId: 'test-refusal',
            systemPrompt: 'system',
            userPrompt: 'user',
          }),
        ).rejects.toThrow(
          'provider_refusal',
        )
      },
    )
  },
)
