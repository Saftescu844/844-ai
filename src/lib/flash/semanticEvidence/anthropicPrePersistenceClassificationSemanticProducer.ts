import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashPrePersistenceClassificationSemanticProducer,
} from './prePersistenceClassificationSemanticProducer'

export interface AnthropicPrePersistenceClassificationSemanticProducerOptions {
  client: Anthropic
  model: string
  maxTokens?: number
  temperature?: number
}

/**
 * Composes the Anthropic SDK with the provider-agnostic
 * REG-001S pre-persistence classification producer.
 *
 * It does not:
 * - read ANTHROPIC_API_KEY;
 * - create the Anthropic client;
 * - execute a request at construction time;
 * - write to Payload;
 * - generate Flash editorial content;
 * - decide AUTO / REVIEW / BLOCK.
 *
 * A provider request is made only when the returned producer
 * is explicitly executed by the caller.
 */
export function createAnthropicFlashPrePersistenceClassificationSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicPrePersistenceClassificationSemanticProducerOptions) {
  const executor =
    createAnthropicSemanticTextExecutor({
      client:
        createAnthropicSdkTextClient(
          client,
        ),
      model,
      ...(maxTokens === undefined
        ? {}
        : {
            maxTokens,
          }),
      ...(temperature === undefined
        ? {}
        : {
            temperature,
          }),
    })

  return createFlashPrePersistenceClassificationSemanticProducer({
    executor,
    provider:
      'anthropic',
    model,
  })
}
