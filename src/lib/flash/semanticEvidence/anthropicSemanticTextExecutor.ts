import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface AnthropicSemanticJsonSchemaFormat {
  type:
    'json_schema'

  schema:
    Record<string, unknown>
}

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

  output_config?: {
    format:
      AnthropicSemanticJsonSchemaFormat
  }
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

  stop_reason?:
    string | null
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

  structuredOutputSchema?:
    Record<string, unknown>
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

function assertUsableStopReason(
  response:
    AnthropicSemanticMessageResponse,
): void {
  if (
    response.stop_reason ===
      'max_tokens' ||
    response.stop_reason ===
      'model_context_window_exceeded'
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'provider_output_truncated',
    )
  }

  if (
    response.stop_reason ===
    'refusal'
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'provider_refusal',
    )
  }
}

function extractText(
  response:
    AnthropicSemanticMessageResponse,
  requireSingleTextBlock = false,
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

  const textBlocks =
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

  if (
    requireSingleTextBlock &&
    textBlocks.length !== 1
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'provider_structured_output_multiple_text_blocks',
    )
  }

  const text =
    textBlocks
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
 * Poate transmite opțional un JSON Schema către output_config.format.
 * Producerii care nu cer structured output rămân neschimbați.
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
  structuredOutputSchema,
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

          ...(structuredOutputSchema
            ? {
                output_config: {
                  format: {
                    type:
                      'json_schema' as const,
                    schema:
                      structuredOutputSchema,
                  },
                },
              }
            : {}),
        })
    } catch {
      throw new FlashSemanticEvidenceProducerError(
        'provider_error',
      )
    }

    assertUsableStopReason(
      response,
    )

    const text =
      extractText(
        response,
        Boolean(
          structuredOutputSchema,
        ),
      )

    if (structuredOutputSchema) {
      if (!text.startsWith('{')) {
        throw new FlashSemanticEvidenceProducerError(
          'provider_structured_output_non_json',
        )
      }

      if (!text.endsWith('}')) {
        throw new FlashSemanticEvidenceProducerError(
          'provider_structured_output_incomplete_json',
        )
      }

      try {
        JSON.parse(
          text,
        )
      } catch {
        throw new FlashSemanticEvidenceProducerError(
          'provider_structured_output_invalid_json',
        )
      }
    }

    return text
  }
}
