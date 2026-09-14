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
  createAnthropicFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicPrePersistenceEditorialQualityReviewSemanticProducer'

import {
  ANTHROPIC_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
  DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
} from '@/lib/flash/semanticEvidence/anthropicPrePersistenceEditorialGenerationSemanticProducer'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

import {
  countFlashEditorialWords,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  runFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewSemanticProducer'

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
      'The fourth GPAI Signatory Taskforce meeting covered Safety and Security and Copyright.',
    bodyParagraphs: [
      'The AI Office discussed marginal-risk clauses and safeguards.',
    ],
    bodyText:
      'The AI Office discussed marginal-risk clauses and safeguards.',
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

const draft:
  FlashPrePersistenceEditorialGenerationSemanticOutput = {
    language: 'ro',
    editorialTitle:
      'Reuniunea GPAI',
    editorialParagraphs: [
      words(
        500,
        'draft',
      ),
    ],
  }

function validReviewedRaw(): string {
  return JSON.stringify({
    language: 'ro',
    editorialTitle:
      'Reuniunea GPAI',
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
  'Anthropic pre-persistence editorial quality review composition',
  () => {
    it(
      'uses one structured bounded request and no request at construction time',
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
                      validReviewedRaw(),
                  },
                ],
              }
            },
          },
        } as unknown as Anthropic

        const producer =
          createAnthropicFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            client,
            model:
              'claude-test',
          })

        expect(requests)
          .toHaveLength(0)

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              editorial:
                draft,
              runId:
                'anthropic-editorial-quality-review-test',
            },
          })

        expect(requests)
          .toHaveLength(1)

        expect(
          requests[0],
        ).toMatchObject({
          model:
            'claude-test',
          max_tokens:
            DEFAULT_ANTHROPIC_PREPERSISTENCE_EDITORIAL_MAX_TOKENS,
          temperature: 0,
          output_config: {
            format: {
              type:
                'json_schema',
              schema:
                ANTHROPIC_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
            },
          },
          messages: [
            {
              role: 'user',
            },
          ],
        })

        expect(result).toMatchObject({
          ok: true,
          editorial: {
            language: 'ro',
          },
          run: {
            stage:
              'prePersistenceEditorialQualityReview',
            method: 'model',
            provider: 'anthropic',
            model: 'claude-test',
          },
        })

        if (result.ok) {
          expect(
            countFlashEditorialWords(
              result.editorial.editorialParagraphs,
            ),
          ).toBe(500)
        }
      },
    )
  },
)
