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
  FLASH_EDITORIAL_MAX_TITLE_LENGTH,
  countFlashEditorialWords,
  parseFlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  buildFlashPrePersistenceEditorialGenerationSemanticPrompt,
  createFlashPrePersistenceEditorialGenerationSemanticProducer,
  runFlashPrePersistenceEditorialGenerationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'

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
  prefix = 'cuvânt',
): string {
  return Array.from(
    {
      length: count,
    },
    (_, index) =>
      `${prefix}${String(index + 1)}`,
  ).join(' ')
}

function validEditorialRaw() {
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
  'Flash pre-persistence editorial generation semantic contract',
  () => {
    it(
      'parses a strict Romanian editorial draft between 500 and 1000 words',
      () => {
        const result =
          parseFlashPrePersistenceEditorialGenerationSemanticOutput(
            validEditorialRaw(),
          )

        expect(result.language)
          .toBe('ro')

        expect(result.editorialTitle)
          .toBe(
            'Oficiul european pentru IA continuă lucrul privind regulile GPAI',
          )

        expect(
          countFlashEditorialWords(
            result.editorialParagraphs,
          ),
        ).toBe(500)
      },
    )

    it.each([
      {
        raw:
          '```json\n{"language":"ro"}\n```',
        reason:
          'invalid_output_json',
      },
      {
        raw:
          JSON.stringify({
            language: 'ro',
            editorialTitle:
              'Câmp suplimentar',
            editorialParagraphs: [
              words(500),
            ],
            rationale:
              'not allowed',
          }),
        reason:
          'invalid_output_shape',
      },
      {
        raw:
          JSON.stringify({
            language: 'en',
            editorialTitle:
              'Wrong language',
            editorialParagraphs: [
              words(500),
            ],
          }),
        reason:
          'invalid_output_language',
      },
      {
        raw:
          JSON.stringify({
            language: 'ro',
            editorialTitle:
              'x'.repeat(
                FLASH_EDITORIAL_MAX_TITLE_LENGTH +
                  1,
              ),
            editorialParagraphs: [
              words(500),
            ],
          }),
        reason:
          'invalid_output_title',
      },
      {
        raw:
          JSON.stringify({
            language: 'ro',
            editorialTitle:
              'Paragraf gol',
            editorialParagraphs: [
              words(500),
              '   ',
            ],
          }),
        reason:
          'invalid_output_paragraphs',
      },
      {
        raw:
          JSON.stringify({
            language: 'ro',
            editorialTitle:
              'Punctuație fără text',
            editorialParagraphs: [
              words(500),
              ',',
            ],
          }),
        reason:
          'invalid_output_paragraphs',
      },
      {
        raw:
          JSON.stringify({
            language: 'ro',
            editorialTitle:
              'Prea scurt',
            editorialParagraphs: [
              words(499),
            ],
          }),
        reason:
          'invalid_output_too_short',
      },
      {
        raw:
          JSON.stringify({
            language: 'ro',
            editorialTitle:
              'Prea lung',
            editorialParagraphs: [
              words(1001),
            ],
          }),
        reason:
          'invalid_output_too_long',
      },
    ])(
      'fails closed with diagnostic reason $reason',
      ({
        raw,
        reason,
      }) => {
        expect(
          () =>
            parseFlashPrePersistenceEditorialGenerationSemanticOutput(
              raw,
            ),
        ).toThrow(
          reason,
        )
      },
    )

    it(
      'builds a Romanian-original-generation prompt from the source candidate and validated classification',
      () => {
        const prompt =
          buildFlashPrePersistenceEditorialGenerationSemanticPrompt(
            candidate,
            classification,
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'target editorial language for this stage is Romanian (ro)',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Write an original editorial synthesis, not a translation or reconstruction of the sources.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'between 500 and 1000 words',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT:',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"flashType": "regulation"',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'Fourth GPAI Signatory Taskforce meeting',
        )
      },
    )

    it(
      'accepts a valid provider result without changing classification or persistence state',
      async () => {
        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () =>
              validEditorialRaw(),
          })

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              runId:
                'editorial-generation-test-1',
            },
          })

        expect(result).toMatchObject({
          ok: true,
          editorial: {
            language: 'ro',
          },
          run: {
            stage:
              'prePersistenceEditorialGeneration',
            method: 'model',
            runId:
              'editorial-generation-test-1',
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
      'returns the specific contract failure reason from the producer runner',
      async () => {
        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () =>
              JSON.stringify({
                language: 'ro',
                editorialTitle:
                  'Prea scurt',
                editorialParagraphs: [
                  words(25),
                ],
              }),
          })

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              runId:
                'editorial-generation-test-2',
            },
          })

        expect(result).toMatchObject({
          ok: false,
          editorial: null,
          reason:
            'invalid_output_too_short',
        })
      },
    )

    it(
      'fails closed when runId is empty without invoking the executor',
      async () => {
        let executions = 0

        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () => {
              executions += 1
              return validEditorialRaw()
            },
          })

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              runId: '   ',
            },
          })

        expect(result).toMatchObject({
          ok: false,
          editorial: null,
          reason: 'invalid_input',
        })

        expect(executions).toBe(0)
      },
    )
  },
)
