import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashPrePersistenceEditorialGenerationSemanticProducer,
} from './prePersistenceEditorialGenerationSemanticProducer'

import {
  FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
} from './prePersistenceEditorialGenerationSemanticSchema'

export const DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS =
  4096

export const ANTHROPIC_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA =
  FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA

export interface AnthropicPrePersistenceEditorialGenerationSemanticProducerOptions {
  client: Anthropic
  model: string
  maxTokens?: number
  temperature?: number
}

/**
 * Composes the Anthropic SDK with the provider-agnostic
 * REG-001T pre-persistence bilingual editorial generator.
 *
 * The higher default token ceiling is deliberate: a validated Flash
 * editorial may contain 500–1000 Romanian words plus strict JSON framing.
 * It remains only a ceiling; the semantic parser still enforces the exact
 * editorial word-count and title-length contract.
 *
 * Anthropic structured output constrains only the JSON shape. The
 * application parser remains authoritative for 500–1000 words, title
 * length, language value, and all fail-closed semantic boundaries.
 *
 * It does not:
 * - read ANTHROPIC_API_KEY;
 * - create the Anthropic client;
 * - execute a request at construction time;
 * - write to Payload;
 * - decide AUTO / REVIEW / BLOCK;
 *
 * A provider request is made only when the returned producer
 * is explicitly executed by the caller.
 */
export function createAnthropicFlashPrePersistenceEditorialGenerationSemanticProducer({
  client,
  model,
  maxTokens =
    DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
  temperature,
}: AnthropicPrePersistenceEditorialGenerationSemanticProducerOptions) {
  const executor =
    createAnthropicSemanticTextExecutor({
      client:
        createAnthropicSdkTextClient(
          client,
        ),
      model,
      maxTokens,
      structuredOutputSchema:
        ANTHROPIC_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
      ...(temperature === undefined
        ? {}
        : {
            temperature,
          }),
    })

  return createFlashPrePersistenceEditorialGenerationSemanticProducer({
    executor,
    provider:
      'anthropic',
    model,
  })
}
