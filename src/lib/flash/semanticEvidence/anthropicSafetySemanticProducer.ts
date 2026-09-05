import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
  type AnthropicSemanticMessageCreateParams,
  type AnthropicSemanticMessageResponse,
  type AnthropicSemanticTextClient,
} from './anthropicSemanticTextExecutor'

import {
  createFlashSafetySemanticProducer,
} from './safetySemanticProducer'

export interface AnthropicSafetySemanticProducerOptions {
  client:
    Anthropic

  model:
    string

  maxTokens?:
    number

  temperature?:
    number
}

/**
 * Adaptează explicit răspunsul SDK Anthropic la
 * contractul intern minimal.
 *
 * Menținem SDK-ul la marginea sistemului:
 *
 * Anthropic SDK
 *   -> SemanticTextExecutor
 *   -> Safety Semantic Producer
 *   -> structured Safety Evidence
 */
function createAnthropicSdkTextClient(
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

/**
 * Compoziție Anthropic + Safety.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - scrie în Payload;
 * - decide AUTO / REVIEW / BLOCK.
 *
 * Requestul apare doar când producerul este executat
 * prin runFlashSemanticEvidenceProducer().
 */
export function createAnthropicFlashSafetySemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicSafetySemanticProducerOptions) {
  const executor =
    createAnthropicSemanticTextExecutor({
      client:
        createAnthropicSdkTextClient(
          client,
        ),

      model,

      ...(maxTokens ===
        undefined
        ? {}
        : {
            maxTokens,
          }),

      ...(temperature ===
        undefined
        ? {}
        : {
            temperature,
          }),
    })

  return createFlashSafetySemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
