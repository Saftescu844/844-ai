import type Anthropic from '@anthropic-ai/sdk'

import {
  ANTHROPIC_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
  DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
} from './anthropicPrePersistenceEditorialGenerationSemanticProducer'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from './prePersistenceEditorialQualityReviewSemanticProducer'

export interface AnthropicPrePersistenceEditorialQualityReviewSemanticProducerOptions {
  client: Anthropic
  model: string
  maxTokens?: number
  temperature?: number
}

/**
 * Anthropic wrapper for the bounded REG-001T Romanian editorial QA pass.
 *
 * It reuses the same strict structured-output shape as first-pass editorial
 * generation. The application parser remains authoritative for title length
 * and the 500–1000-word editorial contract.
 */
export function createAnthropicFlashPrePersistenceEditorialQualityReviewSemanticProducer({
  client,
  model,
  maxTokens =
    DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
  temperature,
}: AnthropicPrePersistenceEditorialQualityReviewSemanticProducerOptions) {
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

  return createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
    executor,
    provider:
      'anthropic',
    model,
  })
}
