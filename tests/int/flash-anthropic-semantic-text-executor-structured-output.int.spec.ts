import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  createAnthropicSemanticTextExecutor,
  type AnthropicSemanticTextClient,
} from '@/lib/flash/semanticEvidence/anthropicSemanticTextExecutor'

const schema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
    },
  },
  required: [
    'value',
  ],
  additionalProperties: false,
}

function clientWithContent(
  content:
    Array<{
      type: string
      text?: string
    }>,
): AnthropicSemanticTextClient {
  return {
    messages: {
      create: async () => ({
        stop_reason:
          'end_turn',
        content,
      }),
    },
  }
}

function executorFor(
  content:
    Array<{
      type: string
      text?: string
    }>,
) {
  return createAnthropicSemanticTextExecutor({
    client:
      clientWithContent(
        content,
      ),
    model:
      'claude-test',
    structuredOutputSchema:
      schema,
  })
}

const input = {
  runId:
    'structured-output-test',
  systemPrompt:
    'system',
  userPrompt:
    'user',
}

describe(
  'Anthropic structured-output integrity diagnostics',
  () => {
    it(
      'accepts one valid JSON text block',
      async () => {
        const executor =
          executorFor([
            {
              type: 'text',
              text:
                '{"value":"ok"}',
            },
          ])

        await expect(
          executor(input),
        ).resolves.toBe(
          '{"value":"ok"}',
        )
      },
    )

    it(
      'rejects multiple text blocks instead of concatenating them',
      async () => {
        const executor =
          executorFor([
            {
              type: 'text',
              text:
                '{"value":"one"}',
            },
            {
              type: 'text',
              text:
                '{"value":"two"}',
            },
          ])

        await expect(
          executor(input),
        ).rejects.toThrow(
          'provider_structured_output_multiple_text_blocks',
        )
      },
    )

    it(
      'diagnoses a non-JSON prefix',
      async () => {
        const executor =
          executorFor([
            {
              type: 'text',
              text:
                'Here is the result: {"value":"ok"}',
            },
          ])

        await expect(
          executor(input),
        ).rejects.toThrow(
          'provider_structured_output_non_json',
        )
      },
    )

    it(
      'diagnoses an incomplete JSON object',
      async () => {
        const executor =
          executorFor([
            {
              type: 'text',
              text:
                '{"value":"unfinished"',
            },
          ])

        await expect(
          executor(input),
        ).rejects.toThrow(
          'provider_structured_output_incomplete_json',
        )
      },
    )

    it(
      'diagnoses syntactically invalid JSON that still has braces',
      async () => {
        const executor =
          executorFor([
            {
              type: 'text',
              text:
                '{"value":}',
            },
          ])

        await expect(
          executor(input),
        ).rejects.toThrow(
          'provider_structured_output_invalid_json',
        )
      },
    )
  },
)
