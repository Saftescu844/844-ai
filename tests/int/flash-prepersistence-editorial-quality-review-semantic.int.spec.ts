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
  countFlashEditorialWords,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  buildFlashPrePersistenceEditorialQualityReviewSemanticPrompt,
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
      'The AI Office said marginal-risk clauses could only be invoked in exceptional circumstances and under safeguards.',
    ],
    bodyText:
      'The AI Office said marginal-risk clauses could only be invoked in exceptional circumstances and under safeguards.',
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
      'Reuniunea GPAI șiSecuritatea modelelor',
    editorialParagraphs: [
      words(
        500,
        'draft',
      ),
    ],
  }

function reviewedRaw(
  wordCount: number,
): string {
  return JSON.stringify({
    language: 'ro',
    editorialTitle:
      'Reuniunea GPAI și securitatea modelelor',
    editorialParagraphs: [
      words(
        wordCount,
        'revizuit',
      ),
    ],
  })
}

describe(
  'Flash pre-persistence editorial quality review semantic producer',
  () => {
    it(
      'builds a bounded source-fidelity and Romanian-proofreading prompt',
      () => {
        const prompt =
          buildFlashPrePersistenceEditorialQualityReviewSemanticPrompt(
            candidate,
            classification,
            draft,
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'sole factual authority',
        )
        expect(
          prompt.systemPrompt,
        ).toContain(
          'Fix every concatenated-word or missing-space defect',
        )
        expect(
          prompt.systemPrompt,
        ).toContain(
          'Remove claims, background, definitions, examples, consequences, conclusions, or interpretations',
        )
        expect(
          prompt.systemPrompt,
        ).toContain(
          'source fidelity has priority over length',
        )
        expect(
          prompt.systemPrompt,
        ).toContain(
          'return the shorter faithful version anyway',
        )
        expect(
          prompt.systemPrompt,
        ).toContain(
          'Never invent, speculate, generalize, repeat, or pad',
        )
        expect(
          prompt.userPrompt,
        ).toContain(
          '"editorialDraft"',
        )
        expect(
          prompt.userPrompt,
        ).toContain(
          'Reuniunea GPAI șiSecuritatea modelelor',
        )
      },
    )

    it(
      'accepts one corrected Romanian editorial within the publication word-count contract',
      async () => {
        let executions = 0

        const producer =
          createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () => {
              executions += 1
              return reviewedRaw(
                500,
              )
            },
          })

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              editorial:
                draft,
              runId:
                'editorial-quality-review-test',
            },
          })

        expect(executions)
          .toBe(1)

        expect(result).toMatchObject({
          ok: true,
          wordCount: 500,
          meetsEditorialWordCount: true,
          editorial: {
            language: 'ro',
            editorialTitle:
              'Reuniunea GPAI și securitatea modelelor',
          },
          run: {
            stage:
              'prePersistenceEditorialQualityReview',
            method: 'model',
            provider:
              'test-provider',
            model:
              'test-model',
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

    it(
      'returns a shorter source-faithful QA result as diagnostic output without treating it as publication-length eligible',
      async () => {
        const producer =
          createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () =>
              reviewedRaw(
                420,
              ),
          })

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              editorial:
                draft,
              runId:
                'editorial-quality-review-short-test',
            },
          })

        expect(result).toMatchObject({
          ok: true,
          wordCount: 420,
          meetsEditorialWordCount: false,
          editorial: {
            language: 'ro',
          },
        })
      },
    )

    it(
      'fails closed before provider execution when runId is empty',
      async () => {
        let executions = 0

        const producer =
          createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () => {
              executions += 1
              return reviewedRaw(
                500,
              )
            },
          })

        const result =
          await runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              editorial:
                draft,
              runId: '   ',
            },
          })

        expect(result).toMatchObject({
          ok: false,
          editorial: null,
          wordCount: null,
          meetsEditorialWordCount: false,
          reason: 'invalid_input',
        })

        expect(executions)
          .toBe(0)
      },
    )
  },
)
