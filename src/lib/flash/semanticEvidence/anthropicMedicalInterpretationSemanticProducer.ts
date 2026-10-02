import type Anthropic from '@anthropic-ai/sdk'

import {
  createAnthropicSemanticTextExecutor,
} from './anthropicSemanticTextExecutor'

import {
  createFlashMedicalInterpretationSemanticProducer,
} from './medicalInterpretationSemanticProducer'

import {
  createAnthropicSdkTextClient,
} from './anthropicSdkTextClient'

export interface AnthropicMedicalInterpretationSemanticProducerOptions {
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
 * Compoziție Anthropic + Medical Interpretation.
 *
 * Nu:
 * - citește ANTHROPIC_API_KEY;
 * - creează clientul Anthropic;
 * - face request la creare;
 * - scrie în Payload;
 * - decide AUTO / REVIEW / BLOCK.
 */
export function createAnthropicFlashMedicalInterpretationSemanticProducer({
  client,
  model,
  maxTokens,
  temperature,
}: AnthropicMedicalInterpretationSemanticProducerOptions) {
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

  return createFlashMedicalInterpretationSemanticProducer({
    executor,

    provider:
      'anthropic',

    model,
  })
}
