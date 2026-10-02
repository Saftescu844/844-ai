import type OpenAI from 'openai'

import {
  createOpenAiSdkTextClient,
} from './openAiSdkTextClient'

import {
  createOpenAiSemanticTextExecutor,
} from './openAiSemanticTextExecutor'

import {
  createFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from './prePersistenceEditorialQualityReviewSemanticProducer'

import {
  FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA,
} from './prePersistenceEditorialQualityReviewSemanticSchema'

export const DEFAULT_OPENAI_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_MAX_OUTPUT_TOKENS =
  4096

export interface OpenAiPrePersistenceEditorialQualityReviewSemanticProducerOptions {
  client:
    OpenAI

  model:
    string

  maxOutputTokens?:
    number
}

/**
 * OpenAI composition for the controlled REG-001T bilingual
 * editorial quality-review copy-edit pass.
 *
 * The model returns only title + indexed paragraph replacements.
 * The provider-independent producer applies those edits and enforces
 * paragraph bounds, publication diagnostics, and the controlled
 * retention floor; source fidelity remains governed by the prompt and source set.
 *
 * No API key is read here.
 * No request occurs at construction time.
 * No Payload write occurs here.
 */
export function createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer({
  client,
  model,
  maxOutputTokens =
    DEFAULT_OPENAI_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_MAX_OUTPUT_TOKENS,
}: OpenAiPrePersistenceEditorialQualityReviewSemanticProducerOptions) {
  const executor =
    createOpenAiSemanticTextExecutor({
      client:
        createOpenAiSdkTextClient(
          client,
        ),

      model,

      maxOutputTokens,

      structuredOutputSchema:
        FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA,

      structuredOutputName:
        'flash_prepersistence_editorial_quality_review',
    })

  return createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
    executor,

    provider:
      'openai',

    model,
  })
}
