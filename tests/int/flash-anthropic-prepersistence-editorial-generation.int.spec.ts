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
  createAnthropicFlashPrePersistenceEditorialGenerationSemanticProducer,
  DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
} from '@/lib/flash/semanticEvidence/anthropicPrePersistenceEditorialGenerationSemanticProducer'

import {
  countFlashEditorialWords,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  runFlashPrePersistenceEditorialGenerationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

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

const classification:
  FlashPrePersistenceClassificationSemanticOutput = {
    pilonId: 1,
    flashType: 'regulation',
    informationStatus: 'official',
    riskLevel: 'medium',
    isHealthRelated: false,
  }

function words(
  count: number,
  prefix: string,
): string {
  return Array.from(
    {
      length: count,
    },
    (_, index) =>
      `${prefix}${String(index + 1)}`,
  ).join(' ')
}

function validEditorialRaw(): string {
  return JSON.stringify({
    language: 'ro',
    editorialTitle:
      'Oficiul european pentru IA continuă lucrul privind regulile GPAI',
    editorialParagraphs: [
      words(
        250,
        'primul',
      ),
      words(
        250,
        'aldoilea',
      ),
    ],
  })
}

describe(
  'Anthropic pre-persistence editorial generation composition',
  () => {
    it(
      'does not request at construction and delegates one bounded Romanian editorial request when run',
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
                      validEditorialRaw(),
                  },
                ],
              }
            },
          },
        } as unknown as Anthropic

        const producer =
          createAnthropicFlashPrePersistenceEditorialGenerationSemanticProducer({
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
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              runId:
                'anthropic-editorial-generation-test',
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
          max_tokens:
            DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
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
          editorial: {
            language: 'ro',
            editorialTitle:
              'Oficiul european pentru IA continuă lucrul privind regulile GPAI',
          },
          run: {
            stage:
              'prePersistenceEditorialGeneration',
            method:
              'model',
            provider:
              'anthropic',
            model:
              'claude-test',
          },
        })

        if (result.ok) {
          expect(
            countFlashEditorialWords(
              result.editorial.editorialParagraphs,
            ),
          ).toBe(
            500,
          )
        }
      },
    )
  },
)
