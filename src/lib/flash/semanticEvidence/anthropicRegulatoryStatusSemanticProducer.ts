import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashRegulatoryStatusSemanticProducer,
} from './regulatoryStatusSemanticProducer'

export interface AnthropicRegulatoryStatusSemanticProducerOptions {
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
 * Compoziție Anthropic + Regulatory Status.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - scrie în Payload;
 * - stabilește juridic statusul regulator;
 * - decide AUTO / REVIEW / BLOCK.
 */
export function createAnthropicFlashRegulatoryStatusSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicRegulatoryStatusSemanticProducerOptions) {
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

  return createFlashRegulatoryStatusSemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
