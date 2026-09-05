import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

import {
  createFlashFactualVerificationSemanticProducer,
} from './factualVerificationSemanticProducer'

export interface AnthropicFactualVerificationSemanticProducerOptions {
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
 * Compoziție Anthropic + Factual Verification.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - face source lookup;
 * - creează citationId sau evidenceRef;
 * - decide supportStatus;
 * - scrie în Payload;
 * - decide AUTO / REVIEW / BLOCK.
 *
 * Requestul apare numai când producerul este rulat
 * explicit prin factual verification runner.
 */
export function createAnthropicFlashFactualVerificationSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicFactualVerificationSemanticProducerOptions) {
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

  return createFlashFactualVerificationSemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
