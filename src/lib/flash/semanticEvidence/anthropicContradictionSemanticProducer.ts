import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashContradictionSemanticProducer,
} from './contradictionSemanticProducer'

export interface AnthropicContradictionSemanticProducerOptions {
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
 * Compoziție Anthropic + Contradiction Semantic Producer.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - face source lookup;
 * - modifică citationId / evidenceRef;
 * - scrie în Payload;
 * - decide AUTO / REVIEW / BLOCK.
 */
export function createAnthropicFlashContradictionSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicContradictionSemanticProducerOptions) {
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

  return createFlashContradictionSemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
