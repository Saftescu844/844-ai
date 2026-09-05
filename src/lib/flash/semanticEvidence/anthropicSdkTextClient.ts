import type Anthropic from '@anthropic-ai/sdk'

import type {
  AnthropicSemanticMessageCreateParams,
  AnthropicSemanticMessageResponse,
  AnthropicSemanticTextClient,
} from './anthropicSemanticTextExecutor'

/**
 * Adaptor comun:
 *
 * @anthropic-ai/sdk
 *   -> AnthropicSemanticTextClient
 *
 * Menține SDK-ul Anthropic la marginea sistemului,
 * astfel încât SemanticTextExecutor și producerii
 * să rămână independenți de tipurile SDK.
 */
export function createAnthropicSdkTextClient(
  client:
    Anthropic,
): AnthropicSemanticTextClient {
  return {
    messages: {
      async create(
        params:
          AnthropicSemanticMessageCreateParams,
      ): Promise<
        AnthropicSemanticMessageResponse
      > {
        const response =
          await client.messages.create({
            model:
              params.model,

            max_tokens:
              params.max_tokens,

            temperature:
              params.temperature,

            system:
              params.system,

            messages:
              params.messages,
          })

        return {
          content:
            response.content.map(
              block => {
                if (
                  block.type ===
                  'text'
                ) {
                  return {
                    type:
                      'text',

                    text:
                      block.text,
                  }
                }

                return {
                  type:
                    block.type,
                }
              },
            ),
        }
      },
    },
  }
}
