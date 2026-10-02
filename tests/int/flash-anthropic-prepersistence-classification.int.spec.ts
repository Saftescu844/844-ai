import type Anthropic from '@anthropic-ai/sdk'

import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import {
  createAnthropicFlashPrePersistenceClassificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicPrePersistenceClassificationSemanticProducer'
import {
  runFlashPrePersistenceClassificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticProducer'

const candidate:
  FlashNormalizedArticleCandidate = {
    sourceId: 4,
    sourceName:
      'Comisia Europeană — Digital Strategy / AI',
    sourceRole: 'primary',
    editorialTrust: 'high',
    citationMode: 'paraphrase',
    allowAutoPublish: false,
    language: 'en',
    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
    title:
      'Fourth GPAI Signatory Taskforce meeting',
    contentType: 'News article',
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
    id: 1,
    name: 'Știri AI',
  },
]

describe(
  'Anthropic pre-persistence classification composition',
  () => {
    it(
      'does not request at construction and delegates one bounded classification request when run',
      async () => {
        const requests:
          unknown[] = []

        const client = {
          messages: {
            create: async (
              params: unknown,
            ) => {
              requests.push(
                params,
              )

              return {
                content: [
                  {
                    type: 'text',
                    text:
                      JSON.stringify({
                        pilonId: 1,
                        flashType:
                          'regulation',
                        informationStatus:
                          'official',
                        riskLevel:
                          'low',
                        isHealthRelated:
                          false,
                      }),
                  },
                ],
              }
            },
          },
        } as unknown as Anthropic

        const producer =
          createAnthropicFlashPrePersistenceClassificationSemanticProducer({
            client,
            model:
              'claude-test',
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
                'anthropic-classification-test',
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
            'claude-test',
          temperature:
            0,
          messages: [
            {
              role:
                'user',
            },
          ],
        })

        expect(
          result,
        ).toMatchObject({
          ok: true,
          classification: {
            pilonId: 1,
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
              'anthropic',
            model:
              'claude-test',
          },
        })
      },
    )
  },
)
