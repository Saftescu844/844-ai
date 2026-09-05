import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

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
