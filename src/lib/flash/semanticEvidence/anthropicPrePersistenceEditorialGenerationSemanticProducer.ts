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

export const DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS =
  4096

export interface AnthropicPrePersistenceEditorialGenerationSemanticProducerOptions {
  client: Anthropic
  model: string
  maxTokens?: number
  temperature?: number
}

/**
 * Composes the Anthropic SDK with the provider-agnostic
 * REG-001T pre-persistence Romanian editorial generator.
 *
 * The higher default token ceiling is deliberate: a validated Flash
 * editorial may contain 500–1000 Romanian words plus strict JSON framing.
 * It remains only a ceiling; the semantic parser still enforces the exact
 * editorial word-count contract.
 *
 * It does not:
 * - read ANTHROPIC_API_KEY;
 * - create the Anthropic client;
 * - execute a request at construction time;
 * - write to Payload;
 * - decide AUTO / REVIEW / BLOCK;
 * - generate the EN version.
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
