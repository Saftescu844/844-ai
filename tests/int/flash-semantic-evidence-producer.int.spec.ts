import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
  runFlashSemanticEvidenceProducer,
  type FlashSemanticEvidenceProducer,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

interface TestEvidence {
  findings:
    string[]
}

function document():
  FlashSemanticDocument {
  return {
    flashId:
      1,

    language:
      'ro',

    title:
      'Flash test',

    excerpt:
      'Rezumat',

    bodyText:
      'Conținut pentru analiză.',

    metadata: {
      flashType:
        'research',

      informationStatus:
        'confirmed',

      riskLevel:
        'low',

      isHealthRelated:
        false,

      medicalEvidenceType:
        'notApplicable',

      clinicalValidationStatus:
        'notApplicable',
    },
  }
}

function producer({
  produce,
}: {
  produce:
    FlashSemanticEvidenceProducer<TestEvidence>['produce']
}): FlashSemanticEvidenceProducer<TestEvidence> {
  return {
    descriptor: {
      kind:
        'safety',

      method:
        'model',

      provider:
        '  test-provider  ',

      model:
        '  test-model  ',
    },

    produce,
  }
}

describe(
  'Flash semantic evidence producer contract',
  () => {
    it(
      'returns structured evidence with normalized run metadata',
      async () => {
        const produce =
          vi.fn(
            async () => ({
              findings: [
                'finding-1',
              ],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producer({
                produce,
              }),

            input: {
              document:
                document(),

              runId:
                '  semantic-run-1  ',
            },
          })

        expect(
          result,
        ).toEqual({
          ok:
            true,

          evidence: {
            findings: [
              'finding-1',
            ],
          },

          run: {
            kind:
              'safety',

            method:
              'model',

            runId:
              'semantic-run-1',

            provider:
              'test-provider',

            model:
              'test-model',
          },
        })

        expect(
          produce,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          produce,
        ).toHaveBeenCalledWith({
          document:
            document(),

          runId:
            'semantic-run-1',
        })
      },
    )

    it(
      'rejects an empty run id without invoking the producer',
      async () => {
        const produce =
          vi.fn(
            async () => ({
              findings: [],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producer({
                produce,
              }),

            input: {
              document:
                document(),

              runId:
                '   ',
            },
          })

        expect(
          result.ok,
        ).toBe(false)

        expect(
          result,
        ).toMatchObject({
          evidence:
            null,

          reason:
            'invalid_input',

          run: {
            runId:
              '',
          },
        })

        expect(
          produce,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'preserves a controlled invalid-output failure',
      async () => {
        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producer({
                produce:
                  async () => {
                    throw new FlashSemanticEvidenceProducerError(
                      'invalid_output',
                    )
                  },
              }),

            input: {
              document:
                document(),

              runId:
                'semantic-run-2',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          evidence:
            null,

          reason:
            'invalid_output',

          run: {
            kind:
              'safety',

            runId:
              'semantic-run-2',
          },
        })
      },
    )

    it(
      'preserves a controlled provider failure',
      async () => {
        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producer({
                produce:
                  async () => {
                    throw new FlashSemanticEvidenceProducerError(
                      'provider_error',
                    )
                  },
              }),

            input: {
              document:
                document(),

              runId:
                'semantic-run-3',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          evidence:
            null,

          reason:
            'provider_error',
        })
      },
    )

    it(
      'converts an unexpected exception to execution_error',
      async () => {
        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producer({
                produce:
                  async () => {
                    throw new Error(
                      'unexpected',
                    )
                  },
              }),

            input: {
              document:
                document(),

              runId:
                'semantic-run-4',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          evidence:
            null,

          reason:
            'execution_error',
        })
      },
    )

    it(
      'allows deterministic producers without provider metadata',
      async () => {
        const deterministic:
          FlashSemanticEvidenceProducer<TestEvidence> = {
          descriptor: {
            kind:
              'contradictions',

            method:
              'deterministic',
          },

          produce:
            async () => ({
              findings:
                [],
            }),
        }

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              deterministic,

            input: {
              document:
                document(),

              runId:
                'deterministic-run-1',
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            true,

          run: {
            kind:
              'contradictions',

            method:
              'deterministic',

            provider:
              null,

            model:
              null,
          },
        })
      },
    )
  },
)
