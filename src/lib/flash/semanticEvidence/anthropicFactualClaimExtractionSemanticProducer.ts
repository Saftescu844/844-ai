import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashFactualClaimExtractionSemanticProducer,
} from './factualClaimExtractionSemanticProducer'

export interface AnthropicFactualClaimExtractionSemanticProducerOptions {
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
 * Compoziție Anthropic + Factual Claim Extraction.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - verifică factual claims;
 * - selectează surse sau chunks;
 * - scrie în Payload;
 * - decide AUTO / REVIEW / BLOCK.
 *
 * Requestul apare numai când producerul este rulat
 * explicit prin runnerul factual claim extraction.
 */
export function createAnthropicFlashFactualClaimExtractionSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicFactualClaimExtractionSemanticProducerOptions) {
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

  return createFlashFactualClaimExtractionSemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
