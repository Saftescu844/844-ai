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
          'Write an original editorial synthesis directly from the supplied verified source set',
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
      'reports the exact initial length without exposing rejected text or spending a second request by default',
      async () => {
        let calls = 0
        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () => {
              calls += 1
              return JSON.stringify({
                language: 'ro',
                editorialTitle: 'Draft privat',
                editorialParagraphs: [words(487, 'sursa')],
              })
            },
          })

        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate,
              classification,
              runId: 'short-default-no-repair',
            },
          })
        expect(calls).toBe(1)
        expect(result).toMatchObject({
          ok: false,
          editorial: null,
          reason: 'invalid_output_too_short',
          lengthDiagnostic: {
            initialWordCount: 487,
            repairedWordCount: null,
            minimumWordCount: 500,
            repairAttempted: false,
            repairSkipReason: 'not_authorized',
          },
        })
        expect(JSON.stringify(result)).not.toContain('Draft privat')
      },
    )

    it(
      'repairs once only when explicitly enabled and source text meets a conservative length guard',
      async () => {
        const sourceCandidate = {
          ...candidate,
          bodyText: words(355, 'source'),
        }
        const calls: Array<{ runId: string; systemPrompt: string; userPrompt: string }> = []
        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async input => {
              calls.push(input)
              return JSON.stringify({
                language: 'ro',
                editorialTitle: 'Revizuire susținută de surse',
                editorialParagraphs: [words(calls.length === 1 ? 460 : 560)],
              })
            },
          })
        const result =
          await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate: sourceCandidate,
              classification,
              targetLanguage: 'ro',
              allowShortDraftRepair: true,
              runId: 'short-opt-in',
            },
          })

        expect(result.ok).toBe(true)
        expect(calls).toHaveLength(2)
        expect(calls[0]?.runId).toBe('short-opt-in')
        expect(calls[1]?.runId).toBe('short-opt-in:short-draft-repair')
        expect(calls[1]?.systemPrompt).toContain('single authorized repair attempt')
        expect(calls[1]?.systemPrompt).toContain('source material cannot support')
        expect(calls[1]?.systemPrompt).toContain('Do not invent facts')
        expect(calls[1]?.userPrompt).toContain('"firstDraftWordCount":460')
        expect(calls[1]?.userPrompt).toContain('source1')
        if (result.ok) {
          expect(countFlashEditorialWords(result.editorial.editorialParagraphs)).toBe(560)
        }
      },
    )

    it(
      'does not spend a repair on a short primary source or an extremely short first attempt',
      async () => {
        for (const scenario of [
          { source: candidate, initial: 480, expected: 'insufficient_primary_source_text' },
          { source: { ...candidate, bodyText: words(360, 'source') }, initial: 150, expected: 'initial_draft_too_short' },
        ]) {
          let calls = 0
          const producer =
            createFlashPrePersistenceEditorialGenerationSemanticProducer({
              provider: 'test-provider',
              model: 'test-model',
              executor: async () => {
                calls += 1
                return JSON.stringify({
                  language: 'ro',
                  editorialTitle: 'Draft din sursă insuficientă',
                  editorialParagraphs: [words(scenario.initial)],
                })
              },
            })
          const result = await runFlashPrePersistenceEditorialGenerationSemanticProducer({
            producer,
            input: {
              candidate: scenario.source,
              classification,
              allowShortDraftRepair: true,
              runId: 'insufficient-material',
            },
          })
          expect(calls).toBe(1)
          expect(result).toMatchObject({
            ok: false,
            reason: 'invalid_output_too_short',
            lengthDiagnostic: {
              initialWordCount: scenario.initial,
              repairAttempted: false,
              repairSkipReason: scenario.expected,
            },
          })
        }
      },
    )

    it(
      'fails closed with both exact counts if the single repair is still too short',
      async () => {
        let calls = 0
        const producer =
          createFlashPrePersistenceEditorialGenerationSemanticProducer({
            provider: 'test-provider',
            model: 'test-model',
            executor: async () => {
              calls += 1
              return JSON.stringify({
                language: 'ro',
                editorialTitle: 'Rezultat insuficient',
                editorialParagraphs: [words(calls === 1 ? 480 : 497)],
              })
            },
          })
        const result = await runFlashPrePersistenceEditorialGenerationSemanticProducer({
          producer,
          input: {
            candidate: { ...candidate, bodyText: words(355, 'source') },
            classification,
            allowShortDraftRepair: true,
            runId: 'short-after-repair',
          },
        })
        expect(calls).toBe(2)
        expect(result).toMatchObject({
          ok: false,
          editorial: null,
          reason: 'invalid_output_too_short',
          lengthDiagnostic: {
            initialWordCount: 480,
            repairedWordCount: 497,
            repairAttempted: true,
            repairSkipReason: null,
          },
        })
      },
    )

    it.each([
      { label: 'malformed JSON', next: 'not-json', reason: 'invalid_output_json' },
      {
        label: 'overlong repair',
        next: JSON.stringify({ language: 'ro', editorialTitle: 'Prea lung', editorialParagraphs: [words(1001)] }),
        reason: 'invalid_output_too_long',
      },
      {
        label: 'wrong language',
        next: JSON.stringify({ language: 'en', editorialTitle: 'Wrong language', editorialParagraphs: [words(550)] }),
        reason: 'invalid_output_language',
      },
    ])('never retries after a $label repair failure', async ({ next, reason }) => {
      let calls = 0
      const producer = createFlashPrePersistenceEditorialGenerationSemanticProducer({
        provider: 'test-provider',
        model: 'test-model',
        executor: async () => {
          calls += 1
          return calls === 1
            ? JSON.stringify({ language: 'ro', editorialTitle: 'First', editorialParagraphs: [words(480)] })
            : next
        },
      })
      const result = await runFlashPrePersistenceEditorialGenerationSemanticProducer({
        producer,
        input: {
          candidate: { ...candidate, bodyText: words(355, 'source') },
          classification,
          allowShortDraftRepair: true,
          runId: 'single-only',
        },
      })
      expect(calls).toBe(2)
      expect(result).toMatchObject({ ok: false, reason })
    })

    it('never calls a repair when the first generation satisfies the strict length', async () => {
      let calls = 0
      const producer = createFlashPrePersistenceEditorialGenerationSemanticProducer({
        provider: 'test-provider',
        model: 'test-model',
        executor: async () => {
          calls += 1
          return validEditorialRaw()
        },
      })
      const result = await runFlashPrePersistenceEditorialGenerationSemanticProducer({
        producer,
        input: {
          candidate: { ...candidate, bodyText: words(355, 'source') },
          classification,
          allowShortDraftRepair: true,
          runId: 'first-valid',
        },
      })
      expect(calls).toBe(1)
      expect(result.ok).toBe(true)
    })

    it('keeps an explicitly requested English repair entirely in English', async () => {
      const languages: string[] = []
      let calls = 0
      const producer = createFlashPrePersistenceEditorialGenerationSemanticProducer({
        provider: 'test-provider',
        model: 'test-model',
        executor: async ({ systemPrompt }) => {
          calls += 1
          languages.push(systemPrompt)
          return JSON.stringify({
            language: 'en',
            editorialTitle: 'An original English editorial',
            editorialParagraphs: [words(calls === 1 ? 465 : 555, 'english')],
          })
        },
      })
      const result = await runFlashPrePersistenceEditorialGenerationSemanticProducer({
        producer,
        input: {
          candidate: { ...candidate, bodyText: words(355, 'source') },
          classification,
          targetLanguage: 'en',
          allowShortDraftRepair: true,
          runId: 'english-repair',
        },
      })
      expect(result.ok).toBe(true)
      expect(calls).toBe(2)
      expect(languages.every(x => x.includes('English (en)'))).toBe(true)
      expect(languages[1]).toContain('same requested language only')
    })

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
