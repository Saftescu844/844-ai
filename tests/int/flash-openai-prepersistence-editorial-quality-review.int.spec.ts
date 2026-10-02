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
  createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from '@/lib/flash/semanticEvidence/openAiPrePersistenceEditorialQualityReviewSemanticProducer'

import {
  FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewSemanticSchema'

import {
  countFlashEditorialWords,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  runFlashPrePersistenceEditorialQualityReviewSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewSemanticProducer'

function words(
  count: number,
  prefix: string,
): string {
  return Array.from(
    { length: count },
    (_, index) =>
      `${prefix}${index + 1}`,
  ).join(' ')
}

const candidate:
  FlashNormalizedArticleCandidate = {
    sourceId: 4,
    sourceName: 'EC',
    sourceRole: 'primary',
    editorialTrust: 'high',
    citationMode: 'paraphrase',
    allowAutoPublish: false,
    language: 'en',
    finalUrl: 'https://example.test/article',
    canonicalUrl: 'https://example.test/article',
    title: 'Primary article',
    contentType: 'News article',
    sourcePublicationDateRaw: '3 August 2026',
    sourcePublicationDate: '2026-08-03',
    lead: 'Primary lead.',
    bodyParagraphs: [
      'Primary body.',
    ],
    bodyText: 'Primary body.',
  }

const editorial:
  FlashPrePersistenceEditorialGenerationSemanticOutput = {
    language: 'ro',
    editorialTitle: 'Titlu inițial',
    editorialParagraphs: [
      words(250, 'primul'),
      words(250, 'aldoilea'),
    ],
  }

describe(
  'OpenAI pre-persistence controlled editorial QA composition',
  () => {
    it(
      'uses strict paragraphEdits output and applies one bounded copy edit',
      async () => {
        const requests: unknown[] = []

        const client = {
          responses: {
            create: async (
              params: unknown,
            ) => {
              requests.push(params)

              return {
                status: 'completed',
                output_text:
                  JSON.stringify({
                    language: 'ro',
                    editorialTitle:
                      'Titlu corectat',
                    paragraphEdits: [
                      {
                        paragraphIndex: 1,
                        replacement:
                          words(
                            250,
                            'corectat',
                          ),
                      },
                    ],
                  }),
                incomplete_details: null,
                error: null,
              }
            },
          },
        } as unknown as OpenAI

        const producer =
          createOpenAiFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            client,
            model: 'gpt-test',
          })

        expect(requests)
          .toHaveLength(0)

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification: {
                pilonId: 1,
                flashType: 'regulation',
                informationStatus: 'official',
                riskLevel: 'medium',
                isHealthRelated: false,
              },
              editorial,
              runId:
                'openai-controlled-qa-test',
            },
          })

        expect(requests)
          .toHaveLength(1)

        expect(requests[0])
          .toMatchObject({
            model: 'gpt-test',
            store: false,
            text: {
              format: {
                type: 'json_schema',
                name:
                  'flash_prepersistence_editorial_quality_review',
                strict: true,
                schema:
                  FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA,
              },
            },
          })

        expect(result)
          .toMatchObject({
            ok: true,
            wordCount: 500,
            meetsEditorialWordCount:
              true,
            editorial: {
              language: 'ro',
              editorialTitle:
                'Titlu corectat',
            },
            run: {
              provider: 'openai',
              model: 'gpt-test',
            },
          })

        if (result.ok) {
          expect(
            result.editorial
              .editorialParagraphs,
          ).toHaveLength(2)

          expect(
            result.editorial
              .editorialParagraphs[0],
          ).toBe(
            editorial
              .editorialParagraphs[0],
          )

          expect(
            result.editorial
              .editorialParagraphs[1],
          ).toContain(
            'corectat1',
          )

          expect(
            countFlashEditorialWords(
              result.editorial
                .editorialParagraphs,
            ),
          ).toBe(500)
        }
      },
    )
  },
)
