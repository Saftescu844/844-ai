import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashExtraordinaryClaimSemanticProducer,
} from './extraordinaryClaimSemanticProducer'

export interface AnthropicExtraordinaryClaimSemanticProducerOptions {
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
 * Compoziție Anthropic + Extraordinary Claim.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - scrie în Payload;
 * - verifică adevărul afirmațiilor;
 * - decide AUTO / REVIEW / BLOCK.
 */
export function createAnthropicFlashExtraordinaryClaimSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicExtraordinaryClaimSemanticProducerOptions) {
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

  return createFlashExtraordinaryClaimSemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
