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
  createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer,
  DEFAULT_OPENAI_PREPERSISTENCE_EDITORIAL_MAX_OUTPUT_TOKENS,
} from '@/lib/flash/semanticEvidence/openAiPrePersistenceEditorialGenerationSemanticProducer'

import {
  countFlashEditorialWords,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  runFlashPrePersistenceEditorialGenerationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'

const candidate: FlashNormalizedArticleCandidate = {
  sourceId: 4,
  sourceName: 'Comisia Europeană — Digital Strategy / AI',
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

const paragraph = Array.from(
  { length: 250 },
  (_, index) => `cuvant${index + 1}`,
).join(' ')

describe(
  'OpenAI pre-persistence editorial generation composition',
  () => {
    it(
      'delegates one strict structured Romanian editorial request',
      async () => {
        const requests: unknown[] = []

        const client = {
          responses: {
            create: async (params: unknown) => {
              requests.push(params)

              return {
                status: 'completed',
                output_text: JSON.stringify({
                  language: 'ro',
                  editorialTitle:
                    'Oficiul european pentru IA continuă lucrul privind regulile GPAI',
                  editorialParagraphs: [
                    paragraph,
                    paragraph,
                  ],
                }),
                incomplete_details: null,
                error: null,
              }
            },
          },
        } as unknown as OpenAI

        const producer =
          createOpenAiFlashPrePersistenceEditorialGenerationSemanticProducer({
            client,
            model: 'gpt-test',
          })

        expect(requests).toHaveLength(0)

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
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
              runId:
                'openai-editorial-generation-test',
            },
          })

        expect(requests).toHaveLength(1)

        expect(requests[0]).toMatchObject({
          model: 'gpt-test',
          max_output_tokens:
            DEFAULT_OPENAI_PREPERSISTENCE_EDITORIAL_MAX_OUTPUT_TOKENS,
          store: false,
          text: {
            format: {
              type: 'json_schema',
              name:
                'flash_prepersistence_editorial_generation',
              strict: true,
            },
          },
        })

        expect(result).toMatchObject({
          ok: true,
          run: {
            provider: 'openai',
            model: 'gpt-test',
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
