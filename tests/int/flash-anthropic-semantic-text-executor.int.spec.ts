import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createAnthropicSemanticTextExecutor,
  DEFAULT_ANTHROPIC_SEMANTIC_MAX_TOKENS,
  DEFAULT_ANTHROPIC_SEMANTIC_TEMPERATURE,
  type AnthropicSemanticTextClient,
} from '@/lib/flash/semanticEvidence/anthropicSemanticTextExecutor'

import {
  FlashSemanticEvidenceProducerError,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

function input() {
  return {
    runId:
      'semantic-run-1',

    systemPrompt:
      'System safety prompt',

    userPrompt:
      'User Flash document',
  }
}

function clientReturning(
  content:
    Array<{
      type:
        string

      text?:
        unknown
    }>,
): {
  client:
    AnthropicSemanticTextClient

  create:
    ReturnType<typeof vi.fn>
} {
  const create =
    vi.fn(
      async () => ({
        content,
      }),
    )

  return {
    client: {
      messages: {
        create,
      },
    },

    create,
  }
}

async function expectFailure({
  executor,
  reason,
}: {
  executor:
    ReturnType<
      typeof createAnthropicSemanticTextExecutor
    >

  reason:
    FlashSemanticEvidenceProducerError['reason']
}) {
  try {
    await executor(
      input(),
    )
  } catch (error) {
    expect(
      error,
    ).toBeInstanceOf(
      FlashSemanticEvidenceProducerError,
    )

    expect(
      (
        error as
          FlashSemanticEvidenceProducerError
      ).reason,
    ).toBe(
      reason,
    )

    return
  }

  throw new Error(
    `Expected ${reason}`,
  )
}

describe(
  'Anthropic semantic text executor',
  () => {
    it(
      'sends the expected non-streaming Anthropic request',
      async () => {
        const {
          client,
          create,
        } =
          clientReturning([
            {
              type:
                'text',

              text:
                '{"findings":[]}',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              '  claude-test-model  ',
          })

        const result =
          await executor(
            input(),
          )

        expect(
          result,
        ).toBe(
          '{"findings":[]}',
        )

        expect(
          create,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          create,
        ).toHaveBeenCalledWith({
          model:
            'claude-test-model',

          max_tokens:
            DEFAULT_ANTHROPIC_SEMANTIC_MAX_TOKENS,

          temperature:
            DEFAULT_ANTHROPIC_SEMANTIC_TEMPERATURE,

          system:
            'System safety prompt',

          messages: [
            {
              role:
                'user',

              content:
                'User Flash document',
            },
          ],
        })
      },
    )

    it(
      'joins Anthropic text blocks and ignores non-text blocks',
      async () => {
        const {
          client,
        } =
          clientReturning([
            {
              type:
                'text',

              text:
                '  {"findings":',
            },
            {
              type:
                'server_tool_use',
            },
            {
              type:
                'text',

              text:
                '[]}  ',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              'claude-test-model',
          })

        const result =
          await executor(
            input(),
          )

        expect(
          result,
        ).toBe(
          '{"findings":[]}',
        )
      },
    )

    it(
      'supports explicit maxTokens and temperature',
      async () => {
        const {
          client,
          create,
        } =
          clientReturning([
            {
              type:
                'text',

              text:
                '{}',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              'claude-test-model',

            maxTokens:
              1024,

            temperature:
              0.2,
          })

        await executor(
          input(),
        )

        expect(
          create,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens:
              1024,

            temperature:
              0.2,
          }),
        )
      },
    )

    it(
      'reports missing model configuration without calling Anthropic',
      async () => {
        const {
          client,
          create,
        } =
          clientReturning([
            {
              type:
                'text',

              text:
                '{}',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              '   ',
          })

        await expectFailure({
          executor,

          reason:
            'configuration_error',
        })

        expect(
          create,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects invalid maxTokens configuration',
      async () => {
        const {
          client,
          create,
        } =
          clientReturning([
            {
              type:
                'text',

              text:
                '{}',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              'claude-test-model',

            maxTokens:
              0,
          })

        await expectFailure({
          executor,

          reason:
            'configuration_error',
        })

        expect(
          create,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'maps an Anthropic client rejection to provider_error',
      async () => {
        const create =
          vi.fn(
            async () => {
              throw new Error(
                'network/provider failure',
              )
            },
          )

        const client:
          AnthropicSemanticTextClient = {
          messages: {
            create,
          },
        }

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              'claude-test-model',
          })

        await expectFailure({
          executor,

          reason:
            'provider_error',
        })
      },
    )

    it(
      'rejects a response without usable text blocks',
      async () => {
        const {
          client,
        } =
          clientReturning([
            {
              type:
                'server_tool_use',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              'claude-test-model',
          })

        await expectFailure({
          executor,

          reason:
            'invalid_output',
        })
      },
    )

    it(
      'rejects blank text output',
      async () => {
        const {
          client,
        } =
          clientReturning([
            {
              type:
                'text',

              text:
                '   ',
            },
          ])

        const executor =
          createAnthropicSemanticTextExecutor({
            client,

            model:
              'claude-test-model',
          })

        await expectFailure({
          executor,

          reason:
            'invalid_output',
        })
      },
    )
  },
)
