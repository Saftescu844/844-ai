import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  createOpenAiSemanticTextExecutor,
  DEFAULT_OPENAI_SEMANTIC_MAX_OUTPUT_TOKENS,
  type OpenAiSemanticResponseCreateParams,
  type OpenAiSemanticTextClient,
} from '@/lib/flash/semanticEvidence/openAiSemanticTextExecutor'

function clientReturning(
  response: {
    status?: string | null
    output_text?: unknown
    incomplete_details?: {
      reason?: string | null
    } | null
    error?: unknown
  },
  requests:
    OpenAiSemanticResponseCreateParams[] = [],
): OpenAiSemanticTextClient {
  return {
    responses: {
      create: async params => {
        requests.push(
          params,
        )

        return response
      },
    },
  }
}

const input = {
  runId:
    'openai-test-run',
  systemPrompt:
    'system instructions',
  userPrompt:
    'user input',
}

describe(
  'OpenAI semantic text executor',
  () => {
    it(
      'sends one bounded non-stored Responses API request',
      async () => {
        const requests:
          OpenAiSemanticResponseCreateParams[] = []

        const executor =
          createOpenAiSemanticTextExecutor({
            client:
              clientReturning(
                {
                  status:
                    'completed',
                  output_text:
                    '  rezultat  ',
                  error:
                    null,
                },
                requests,
              ),
            model:
              '  gpt-test  ',
          })

        await expect(
          executor(input),
        ).resolves.toBe(
          'rezultat',
        )

        expect(requests)
          .toHaveLength(1)

        expect(
          requests[0],
        ).toEqual({
          model:
            'gpt-test',
          instructions:
            'system instructions',
          input:
            'user input',
          max_output_tokens:
            DEFAULT_OPENAI_SEMANTIC_MAX_OUTPUT_TOKENS,
          store:
            false,
        })
      },
    )

    it(
      'passes strict JSON Schema through text.format',
      async () => {
        const requests:
          OpenAiSemanticResponseCreateParams[] = []

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
          additionalProperties:
            false,
        }

        const executor =
          createOpenAiSemanticTextExecutor({
            client:
              clientReturning(
                {
                  status:
                    'completed',
                  output_text:
                    '{"value":"ok"}',
                  error:
                    null,
                },
                requests,
              ),
            model:
              'gpt-test',
            structuredOutputSchema:
              schema,
            structuredOutputName:
              'flash_test_output',
          })

        await expect(
          executor(input),
        ).resolves.toBe(
          '{"value":"ok"}',
        )

        expect(
          requests[0],
        ).toMatchObject({
          store:
            false,
          text: {
            format: {
              type:
                'json_schema',
              name:
                'flash_test_output',
              strict:
                true,
              schema,
            },
          },
        })
      },
    )

    it(
      'fails closed before provider execution when model is empty',
      async () => {
        let executions = 0

        const client:
          OpenAiSemanticTextClient = {
            responses: {
              create: async () => {
                executions += 1

                return {
                  status:
                    'completed',
                  output_text:
                    'unused',
                }
              },
            },
          }

        const executor =
          createOpenAiSemanticTextExecutor({
            client,
            model:
              '   ',
          })

        await expect(
          executor(input),
        ).rejects.toThrow(
          'configuration_error',
        )

        expect(executions)
          .toBe(0)
      },
    )

    it(
      'maps provider rejection to provider_error',
      async () => {
        const client:
          OpenAiSemanticTextClient = {
            responses: {
              create: async () => {
                throw new Error(
                  'network failure',
                )
              },
            },
          }

        const executor =
          createOpenAiSemanticTextExecutor({
            client,
            model:
              'gpt-test',
          })

        await expect(
          executor(input),
        ).rejects.toThrow(
          'provider_error',
        )
      },
    )

    it(
      'reports max-output-token incompletion as truncation',
      async () => {
        const executor =
          createOpenAiSemanticTextExecutor({
            client:
              clientReturning({
                status:
                  'incomplete',
                incomplete_details: {
                  reason:
                    'max_output_tokens',
                },
                output_text:
                  '{"partial":',
              }),
            model:
              'gpt-test',
          })

        await expect(
          executor(input),
        ).rejects.toThrow(
          'provider_output_truncated',
        )
      },
    )

    it(
      'rejects an empty completed output',
      async () => {
        const executor =
          createOpenAiSemanticTextExecutor({
            client:
              clientReturning({
                status:
                  'completed',
                output_text:
                  '   ',
                error:
                  null,
              }),
            model:
              'gpt-test',
          })

        await expect(
          executor(input),
        ).rejects.toThrow(
          'invalid_output',
        )
      },
    )
  },
)
