import type OpenAI from 'openai'

import {
  createOpenAiSdkTextClient,
} from './openAiSdkTextClient'

import {
  createOpenAiSemanticTextExecutor,
} from './openAiSemanticTextExecutor'

import {
  createFlashPrePersistenceEditorialGenerationSemanticProducer,
} from './prePersistenceEditorialGenerationSemanticProducer'

import {
  FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
} from './prePersistenceEditorialGenerationSemanticSchema'

export const DEFAULT_OPENAI_PREPERSISTENCE_EDITORIAL_MAX_OUTPUT_TOKENS =
  4096

export interface OpenAiPrePersistenceEditorialGenerationSemanticProducerOptions {
  client:
    OpenAI

  model:
    string

  maxOutputTokens?:
    number
}

/**
 * OpenAI composition for bounded REG-001T bilingual
 * editorial generation.
 *
 * Provider-independent parsing remains authoritative for:
 * - requested target language;
 * - title validity;
 * - paragraph validity;
 * - 500–1000-word publication contract.
 *
 * No API key is read here.
 * No request occurs at construction time.
 * No Payload write occurs here.
 */
export function createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer({
  client,
  model,
  maxOutputTokens =
    DEFAULT_OPENAI_PREPERSISTENCE_EDITORIAL_MAX_OUTPUT_TOKENS,
}: OpenAiPrePersistenceEditorialGenerationSemanticProducerOptions) {
  const executor =
    createOpenAiSemanticTextExecutor({
      client:
        createOpenAiSdkTextClient(
          client,
        ),

      model,

      maxOutputTokens,

      structuredOutputSchema:
        FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,

      structuredOutputName:
        'flash_prepersistence_editorial_generation',
    })

  return createFlashPrePersistenceEditorialGenerationSemanticProducer({
    executor,

    provider:
      'openai',

    model,
  })
}
