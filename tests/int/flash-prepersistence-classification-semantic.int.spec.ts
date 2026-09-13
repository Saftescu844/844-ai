import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import {
  buildFlashPrePersistenceClassificationSemanticPrompt,
  createFlashPrePersistenceClassificationSemanticProducer,
  runFlashPrePersistenceClassificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticProducer'

import {
  parseFlashPrePersistenceClassificationSemanticOutput,
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

const allowedPilons = [
  {
    id: 1,
    name: 'Știri AI',
  },
]

describe(
  'Flash pre-persistence classification semantic contract',
  () => {
    it(
      'parses only the exact bounded classification shape',
      () => {
        expect(
          parseFlashPrePersistenceClassificationSemanticOutput(
            JSON.stringify({
              pilonId: 1,
              flashType: 'regulation',
              informationStatus: 'official',
              riskLevel: 'low',
              isHealthRelated: false,
            }),
          ),
        ).toEqual({
          pilonId: 1,
          flashType: 'regulation',
          informationStatus: 'official',
          riskLevel: 'low',
          isHealthRelated: false,
        })
      },
    )

    it.each([
      '```json\n{"pilonId":1}\n```',
      JSON.stringify({
        pilonId: 1,
        flashType: 'regulation',
        informationStatus: 'official',
        riskLevel: 'low',
        isHealthRelated: false,
        rationale: 'extra field',
      }),
      JSON.stringify({
        pilonId: 1,
        flashType: 'policy',
        informationStatus: 'official',
        riskLevel: 'low',
        isHealthRelated: false,
      }),
      JSON.stringify({
        pilonId: 0,
        flashType: 'regulation',
        informationStatus: 'official',
        riskLevel: 'low',
        isHealthRelated: false,
      }),
      JSON.stringify({
        pilonId: 1,
        flashType: 'regulation',
        informationStatus: 'official',
        riskLevel: 'low',
        isHealthRelated: 'false',
      }),
    ])(
      'fails closed on malformed or out-of-contract output',
      raw => {
        expect(
          () =>
            parseFlashPrePersistenceClassificationSemanticOutput(
              raw,
            ),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'builds a classification-only prompt with application-controlled pilons',
      () => {
        const prompt =
          buildFlashPrePersistenceClassificationSemanticPrompt(
            candidate,
            allowedPilons,
          )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT generate or rewrite editorial content.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT decide AUTO, REVIEW, BLOCK',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"name": "Știri AI"',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'Fourth GPAI Signatory Taskforce meeting',
        )
      },
    )

    it(
      'accepts a provider result only when pilonId belongs to the supplied scope',
      async () => {
        const producer =
          createFlashPrePersistenceClassificationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () =>
              JSON.stringify({
                pilonId: 1,
                flashType: 'regulation',
                informationStatus: 'official',
                riskLevel: 'low',
                isHealthRelated: false,
              }),
          })

        const result =
          await runFlashPrePersistenceClassificationSemanticProducer({
            producer,
            input: {
              candidate,
              allowedPilons,
              runId: 'classification-test-1',
            },
          })

        expect(result).toMatchObject({
          ok: true,
          classification: {
            pilonId: 1,
            flashType: 'regulation',
            informationStatus: 'official',
            riskLevel: 'low',
            isHealthRelated: false,
          },
          run: {
            stage:
              'prePersistenceClassification',
            method: 'model',
            runId: 'classification-test-1',
            provider: 'test-provider',
            model: 'test-model',
          },
        })
      },
    )

    it(
      'rejects a model-selected pilon outside the application-controlled scope',
      async () => {
        const producer =
          createFlashPrePersistenceClassificationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () =>
              JSON.stringify({
                pilonId: 99,
                flashType: 'regulation',
                informationStatus: 'official',
                riskLevel: 'low',
                isHealthRelated: false,
              }),
          })

        const result =
          await runFlashPrePersistenceClassificationSemanticProducer({
            producer,
            input: {
              candidate,
              allowedPilons,
              runId: 'classification-test-2',
            },
          })

        expect(result).toMatchObject({
          ok: false,
          classification: null,
          reason: 'invalid_output',
        })
      },
    )

    it(
      'fails closed when runId is empty without invoking the executor',
      async () => {
        let executions = 0

        const producer =
          createFlashPrePersistenceClassificationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () => {
              executions += 1
              return '{}'
            },
          })

        const result =
          await runFlashPrePersistenceClassificationSemanticProducer({
            producer,
            input: {
              candidate,
              allowedPilons,
              runId: '   ',
            },
          })

        expect(result).toMatchObject({
          ok: false,
          classification: null,
          reason: 'invalid_input',
        })

        expect(executions).toBe(0)
      },
    )
  },
)
