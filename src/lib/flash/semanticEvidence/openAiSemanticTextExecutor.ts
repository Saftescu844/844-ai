import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface OpenAiSemanticJsonSchemaFormat {
  type:
    'json_schema'

  name:
    string

  strict:
    true

  schema:
    Record<string, unknown>
}

export interface OpenAiSemanticResponseCreateParams {
  model:
    string

  instructions:
    string

  input:
    string

  max_output_tokens:
    number

  store:
    false

  text?: {
    format:
      OpenAiSemanticJsonSchemaFormat
  }
}

export interface OpenAiSemanticResponse {
  status?:
    string | null

  output_text?:
    unknown

  incomplete_details?: {
    reason?:
      string | null
  } | null

  error?:
    unknown
}

export interface OpenAiSemanticTextClient {
  responses: {
    create(
      params:
        OpenAiSemanticResponseCreateParams,
    ): Promise<
      OpenAiSemanticResponse
    >
  }
}

export interface OpenAiSemanticTextExecutorOptions {
  client:
    OpenAiSemanticTextClient

  model:
    string

  maxOutputTokens?:
    number

  structuredOutputSchema?:
    Record<string, unknown>

  structuredOutputName?:
    string
}

export const DEFAULT_OPENAI_SEMANTIC_MAX_OUTPUT_TOKENS =
  4096

export const DEFAULT_OPENAI_STRUCTURED_OUTPUT_NAME =
  'flash_semantic_output'

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

function validateMaxOutputTokens(
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

function cleanStructuredOutputName(
  value:
    string,
): string {
  const cleaned =
    value.trim()

  if (
    !cleaned ||
    cleaned.length > 64
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'configuration_error',
    )
  }

  return cleaned
}

function extractCompletedText(
  response:
    OpenAiSemanticResponse,
): string {
  if (
    response.status ===
    'incomplete'
  ) {
    if (
      response
        .incomplete_details
        ?.reason ===
      'max_output_tokens'
    ) {
      throw new FlashSemanticEvidenceProducerError(
        'provider_output_truncated',
      )
    }

    throw new FlashSemanticEvidenceProducerError(
      'provider_error',
    )
  }

  if (
    response.status &&
    response.status !==
      'completed'
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'provider_error',
    )
  }

  if (response.error) {
    throw new FlashSemanticEvidenceProducerError(
      'provider_error',
    )
  }

  if (
    typeof response.output_text !==
    'string'
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  const text =
    response.output_text.trim()

  if (!text) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  return text
}

/**
 * Thin OpenAI Responses API -> SemanticTextExecutor adapter.
 *
 * Provider-independent semantic producers remain authoritative
 * for parsing and domain validation.
 *
 * This layer:
 * - uses Responses API semantics;
 * - disables response storage explicitly;
 * - supports optional strict JSON Schema output;
 * - does not read OPENAI_API_KEY;
 * - does not instantiate the OpenAI SDK;
 * - does not repair provider output.
 */
export function createOpenAiSemanticTextExecutor({
  client,
  model,
  maxOutputTokens =
    DEFAULT_OPENAI_SEMANTIC_MAX_OUTPUT_TOKENS,
  structuredOutputSchema,
  structuredOutputName =
    DEFAULT_OPENAI_STRUCTURED_OUTPUT_NAME,
}: OpenAiSemanticTextExecutorOptions):
  FlashSemanticTextExecutor {
  return async ({
    systemPrompt,
    userPrompt,
  }) => {
    const normalizedModel =
      cleanRequiredModel(
        model,
      )

    const normalizedMaxOutputTokens =
      validateMaxOutputTokens(
        maxOutputTokens,
      )

    const normalizedStructuredOutputName =
      cleanStructuredOutputName(
        structuredOutputName,
      )

    let response:
      OpenAiSemanticResponse

    try {
      response =
        await client.responses.create({
          model:
            normalizedModel,

          instructions:
            systemPrompt,

          input:
            userPrompt,

          max_output_tokens:
            normalizedMaxOutputTokens,

          store:
            false,

          ...(structuredOutputSchema
            ? {
                text: {
                  format: {
                    type:
                      'json_schema' as const,
                    name:
                      normalizedStructuredOutputName,
                    strict:
                      true as const,
                    schema:
                      structuredOutputSchema,
                  },
                },
              }
            : {}),
        })
    } catch (error) {
      if (
        error instanceof
        FlashSemanticEvidenceProducerError
      ) {
        throw error
      }

      throw new FlashSemanticEvidenceProducerError(
        'provider_error',
      )
    }

    return extractCompletedText(
      response,
    )
  }
}
