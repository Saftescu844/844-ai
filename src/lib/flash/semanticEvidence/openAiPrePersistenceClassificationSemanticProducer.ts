import type OpenAI from 'openai'

import {
  createOpenAiSdkTextClient,
} from './openAiSdkTextClient'

import {
  createOpenAiSemanticTextExecutor,
} from './openAiSemanticTextExecutor'

import {
  createFlashPrePersistenceClassificationSemanticProducer,
} from './prePersistenceClassificationSemanticProducer'

export const OPENAI_PREPERSISTENCE_CLASSIFICATION_OUTPUT_SCHEMA:
  Record<string, unknown> = {
    type:
      'object',

    properties: {
      pilonId: {
        type:
          'integer',
        minimum:
          1,
      },

      flashType: {
        type:
          'string',
        enum: [
          'announcement',
          'research',
          'regulation',
          'product',
          'business',
          'incident',
          'update',
          'other',
        ],
      },

      informationStatus: {
        type:
          'string',
        enum: [
          'official',
          'confirmed',
          'emerging',
          'preliminary',
          'disputed',
          'unverified',
        ],
      },

      riskLevel: {
        type:
          'string',
        enum: [
          'low',
          'medium',
          'high',
        ],
      },

      isHealthRelated: {
        type:
          'boolean',
      },
    },

    required: [
      'pilonId',
      'flashType',
      'informationStatus',
      'riskLevel',
      'isHealthRelated',
    ],

    additionalProperties:
      false,
  }

export interface OpenAiPrePersistenceClassificationSemanticProducerOptions {
  client:
    OpenAI

  model:
    string

  maxOutputTokens?:
    number
}

/**
 * OpenAI composition for REG-001S classification.
 *
 * No API key is read here.
 * No request occurs at construction time.
 * No Payload write occurs here.
 */
export function createOpenAiFlashPrePersistenceClassificationSemanticProducer({
  client,
  model,
  maxOutputTokens,
}: OpenAiPrePersistenceClassificationSemanticProducerOptions) {
  const executor =
    createOpenAiSemanticTextExecutor({
      client:
        createOpenAiSdkTextClient(
          client,
        ),

      model,

      structuredOutputSchema:
        OPENAI_PREPERSISTENCE_CLASSIFICATION_OUTPUT_SCHEMA,

      structuredOutputName:
        'flash_prepersistence_classification',

      ...(maxOutputTokens === undefined
        ? {}
        : {
            maxOutputTokens,
          }),
    })

  return createFlashPrePersistenceClassificationSemanticProducer({
    executor,

    provider:
      'openai',

    model,
  })
}
