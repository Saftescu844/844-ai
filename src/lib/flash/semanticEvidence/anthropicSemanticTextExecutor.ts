import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface AnthropicSemanticMessageCreateParams {
  model:
    string

  max_tokens:
    number

  temperature:
    number

  system:
    string

  messages:
    Array<{
      role:
        'user'

      content:
        string
    }>
}

export interface AnthropicSemanticMessageContentBlock {
  type:
    string

  text?:
    unknown
}

export interface AnthropicSemanticMessageResponse {
  content:
    AnthropicSemanticMessageContentBlock[]
}

/**
 * Interfață structurală minimă peste
 * @anthropic-ai/sdk.
 *
 * O instanță reală `new Anthropic(...)` poate fi
 * furnizată aici, iar testele pot injecta un client
 * fals fără rețea.
 */
export interface AnthropicSemanticTextClient {
  messages: {
    create(
      params:
        AnthropicSemanticMessageCreateParams,
    ): Promise<
      AnthropicSemanticMessageResponse
    >
  }
}

export interface AnthropicSemanticTextExecutorOptions {
  client:
    AnthropicSemanticTextClient

  model:
    string

  maxTokens?:
    number

  temperature?:
    number
}

export const DEFAULT_ANTHROPIC_SEMANTIC_MAX_TOKENS =
  2048

export const DEFAULT_ANTHROPIC_SEMANTIC_TEMPERATURE =
  0

function cleanRequiredModel(
  value:
    string,
): string {
  const cleaned =
    value.trim()

  if (!cleaned) {
    throw new FlashSemanticEvidenceProducerError(
      'configuration_error',
    )
  }

  return cleaned
}

function validateMaxTokens(
  value:
    number,
): number {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'configuration_error',
    )
  }

  return value
}

function validateTemperature(
  value:
    number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'configuration_error',
    )
  }

  return value
}

function extractText(
  response:
    AnthropicSemanticMessageResponse,
): string {
  if (
    !response ||
    !Array.isArray(
      response.content,
    )
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  const text =
    response.content
      .filter(
        block =>
          block?.type ===
            'text' &&
          typeof block.text ===
            'string',
      )
      .map(
        block =>
          block.text as string,
      )
      .join('')
      .trim()

  if (!text) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  return text
}

/**
 * Adaptor subțire Anthropic -> SemanticTextExecutor.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează singur clientul SDK;
 * - decide AUTO / REVIEW / BLOCK;
 * - repară outputul modelului.
 *
 * Clientul și modelul sunt configurate explicit
 * de nivelul superior.
 */
export function createAnthropicSemanticTextExecutor({
  client,
  model,
  maxTokens =
    DEFAULT_ANTHROPIC_SEMANTIC_MAX_TOKENS,
  temperature =
    DEFAULT_ANTHROPIC_SEMANTIC_TEMPERATURE,
}: AnthropicSemanticTextExecutorOptions):
  FlashSemanticTextExecutor {
  return async ({
    systemPrompt,
    userPrompt,
  }) => {
    const normalizedModel =
      cleanRequiredModel(
        model,
      )

    const normalizedMaxTokens =
      validateMaxTokens(
        maxTokens,
      )

    const normalizedTemperature =
      validateTemperature(
        temperature,
      )

    let response:
      AnthropicSemanticMessageResponse

    try {
      response =
        await client.messages.create({
          model:
            normalizedModel,

          max_tokens:
            normalizedMaxTokens,

          temperature:
            normalizedTemperature,

          system:
            systemPrompt,

          messages: [
            {
              role:
                'user',

              content:
                userPrompt,
            },
          ],
        })
    } catch {
      throw new FlashSemanticEvidenceProducerError(
        'provider_error',
      )
    }

    return extractText(
      response,
    )
  }
}
