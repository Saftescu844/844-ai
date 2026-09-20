import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

import {
  FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticSchema'

import {
  buildFlashPrePersistenceEditorialGenerationSemanticPrompt,
  createFlashPrePersistenceEditorialGenerationSemanticProducer,
  runFlashPrePersistenceEditorialGenerationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'

import type {
  FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewSemanticSchema'

import {
  createFlashPrePersistenceEditorialQualityReviewSemanticProducer,
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
      'https://example.test/verified-source',
    canonicalUrl:
      'https://example.test/verified-source',
    title:
      'Verified English source title',
    contentType:
      'News article',
    sourcePublicationDateRaw:
      '20 September 2026',
    sourcePublicationDate:
      '2026-09-20',
    lead:
      'Verified English source lead.',
    bodyParagraphs: [
      'Verified English source body.',
    ],
    bodyText:
      'Verified English source body.',
  }

const classification:
  FlashPrePersistenceClassificationSemanticOutput = {
    pilonId: 1,
    flashType: 'announcement',
    informationStatus: 'official',
    riskLevel: 'low',
    isHealthRelated: false,
  }

function words(
  count: number,
  prefix: string,
): string {
  return Array.from(
    { length: count },
    (_, index) =>
      `${prefix}${String(index + 1)}`,
  ).join(' ')
}

function englishEditorialRaw(): string {
  return JSON.stringify({
    language: 'en',
    editorialTitle:
      'Verified source development explained',
    editorialParagraphs: [
      words(250, 'englishA'),
      words(250, 'englishB'),
    ],
  })
}

describe(
  'Flash U14.8C bilingual editorial generation',
  () => {
    it(
      'allows RO and EN in provider structured-output schemas',
      () => {
        expect(
          (
            FLASH_PREPERSISTENCE_EDITORIAL_OUTPUT_SCHEMA
              .properties as {
                language: {
                  enum: string[]
                }
              }
          ).language.enum,
        ).toEqual([
          'ro',
          'en',
        ])

        expect(
          (
            FLASH_PREPERSISTENCE_EDITORIAL_QUALITY_REVIEW_OUTPUT_SCHEMA
              .properties as {
                language: {
                  enum: string[]
                }
              }
          ).language.enum,
        ).toEqual([
          'ro',
          'en',
        ])
      },
    )

    it(
      'builds EN directly from the verified source set without a Romanian sibling input',
      () => {
        const prompt =
          buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
            candidate,
            classification,
            [],
            'en',
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'target editorial language for this stage is English (en)',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'original English editorial synthesis from the supplied verified source set, not as a translation of any Romanian Flash',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do not use, infer, translate, summarize, or depend on a sibling Flash in the other language',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"targetLanguage": "en"',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'Verified English source title',
        )

        expect(
          prompt.userPrompt,
        ).not.toContain(
          'editorialDraft',
        )
      },
    )

    it(
      'accepts an EN provider result when targetLanguage is EN',
      async () => {
        const prompts:
          Array<{
            systemPrompt: string
            userPrompt: string
          }> = []

        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider:
              'test-provider',
            model:
              'test-model',
            executor:
              async input => {
                prompts.push({
                  systemPrompt:
                    input.systemPrompt,
                  userPrompt:
                    input.userPrompt,
                })

                return englishEditorialRaw()
              },
          })

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              targetLanguage: 'en',
              runId:
                'u14-8c-en-generation',
            },
          })

        expect(result)
          .toMatchObject({
            ok: true,
            editorial: {
              language: 'en',
              editorialTitle:
                'Verified source development explained',
            },
          })

        expect(prompts)
          .toHaveLength(1)

        expect(
          prompts[0].userPrompt,
        ).toContain(
          '"targetLanguage": "en"',
        )
      },
    )

    it(
      'fails closed when provider returns RO for an EN generation run',
      async () => {
        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider:
              'test-provider',
            model:
              'test-model',
            executor:
              async () =>
                JSON.stringify({
                  language: 'ro',
                  editorialTitle:
                    'Limbă greșită',
                  editorialParagraphs: [
                    words(
                      500,
                      'romanian',
                    ),
                  ],
                }),
          })

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              targetLanguage: 'en',
              runId:
                'u14-8c-wrong-language',
            },
          })

        expect(result)
          .toMatchObject({
            ok: false,
            editorial: null,
            reason:
              'invalid_output_language',
          })
      },
    )

    it(
      'reviews an EN editorial in EN and preserves its language',
      async () => {
        const editorial:
          FlashPrePersistenceEditorialGenerationSemanticOutput = {
            language: 'en',
            editorialTitle:
              'Initial English title',
            editorialParagraphs: [
              words(
                500,
                'draftEnglish',
              ),
            ],
          }

        const producer =
          createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            provider:
              'test-provider',
            model:
              'test-model',
            executor:
              async input => {
                expect(
                  input.systemPrompt,
                ).toContain(
                  'existing English Flash AI editorial draft',
                )

                expect(
                  input.userPrompt,
                ).toContain(
                  '"targetLanguage": "en"',
                )

                return JSON.stringify({
                  language: 'en',
                  editorialTitle:
                    'Reviewed English title',
                  paragraphEdits: [],
                })
              },
          })

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              editorial,
              targetLanguage: 'en',
              runId:
                'u14-8c-en-qa',
            },
          })

        expect(result)
          .toMatchObject({
            ok: true,
            editorial: {
              language: 'en',
              editorialTitle:
                'Reviewed English title',
            },
            wordCount: 500,
            meetsEditorialWordCount:
              true,
          })
      },
    )

    it(
      'fails closed before provider execution when QA target language conflicts with the editorial',
      async () => {
        let executions = 0

        const editorial:
          FlashPrePersistenceEditorialGenerationSemanticOutput = {
            language: 'en',
            editorialTitle:
              'English draft',
            editorialParagraphs: [
              words(
                500,
                'draftEnglish',
              ),
            ],
          }

        const producer =
          createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            provider:
              'test-provider',
            model:
              'test-model',
            executor:
              async () => {
                executions += 1
                return '{}'
              },
          })

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              editorial,
              targetLanguage: 'ro',
              runId:
                'u14-8c-qa-language-mismatch',
            },
          })

        expect(result)
          .toMatchObject({
            ok: false,
            editorial: null,
            reason: 'invalid_input',
          })

        expect(executions)
          .toBe(0)
      },
    )
  },
)
