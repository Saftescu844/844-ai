import type OpenAI from 'openai'

import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import {
  createOpenAiFlashPrePersistenceClassificationSemanticProducer,
  OPENAI_PREPERSISTENCE_CLASSIFICATION_OUTPUT_SCHEMA,
} from '@/lib/flash/semanticEvidence/openAiPrePersistenceClassificationSemanticProducer'

import {
  runFlashPrePersistenceClassificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticProducer'

const candidate:
  FlashNormalizedArticleCandidate = {
    sourceId:
      4,

    sourceName:
      'Comisia Europeană — Digital Strategy / AI',

    sourceRole:
      'primary',

    editorialTrust:
      'high',

    citationMode:
      'paraphrase',

    allowAutoPublish:
      false,

    language:
      'en',

    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',

    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',

    title:
      'Fourth GPAI Signatory Taskforce meeting',

    contentType:
      'News article',

    sourcePublicationDateRaw:
      '3 August 2026',

    sourcePublicationDate:
      '2026-08-03',

    lead:
      'The European AI Office hosted the fourth GPAI Signatory Taskforce meeting.',

    bodyParagraphs: [
      'The meeting supported implementation work related to the EU AI Act.',
    ],

    bodyText:
      'The meeting supported implementation work related to the EU AI Act.',
  }

const allowedPilons = [
  {
    id:
      1,

    name:
      'Știri AI',
  },
]

describe(
  'OpenAI pre-persistence classification composition',
  () => {
    it(
      'does not request at construction and delegates one strict structured classification request when run',
      async () => {
        const requests:
          unknown[] = []

        const client = {
          responses: {
            create: async (
              params: unknown,
            ) => {
              requests.push(
                params,
              )

              return {
                status:
                  'completed',

                output_text:
                  JSON.stringify({
                    pilonId:
                      1,

                    flashType:
                      'regulation',

                    informationStatus:
                      'official',

                    riskLevel:
                      'low',

                    isHealthRelated:
                      false,
                  }),

                incomplete_details:
                  null,

                error:
                  null,
              }
            },
          },
        } as unknown as OpenAI

        const producer =
          createOpenAiFlashPrePersistenceClassificationSemanticProducer({
            client,

            model:
              'gpt-test',
          })

        expect(
          requests,
        ).toHaveLength(
          0,
        )

        const result =
          await runFlashPrePersistenceClassificationSemanticProducer({
            producer,

            input: {
              candidate,

              allowedPilons,

              runId:
                'openai-classification-test',
            },
          })

        expect(
          requests,
        ).toHaveLength(
          1,
        )

        expect(
          requests[0],
        ).toMatchObject({
          model:
            'gpt-test',

          store:
            false,

          text: {
            format: {
              type:
                'json_schema',

              name:
                'flash_prepersistence_classification',

              strict:
                true,

              schema:
                OPENAI_PREPERSISTENCE_CLASSIFICATION_OUTPUT_SCHEMA,
            },
          },
        })

        expect(
          result,
        ).toMatchObject({
          ok:
            true,

          classification: {
            pilonId:
              1,

            flashType:
              'regulation',

            informationStatus:
              'official',

            riskLevel:
              'low',

            isHealthRelated:
              false,
          },

          run: {
            provider:
              'openai',

            model:
              'gpt-test',
          },
        })
      },
    )
  },
)
