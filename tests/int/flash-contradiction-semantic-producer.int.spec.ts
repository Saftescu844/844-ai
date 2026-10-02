import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  evaluateFlashContradictions,
} from '@/lib/flash/runtimeEvidence/contradictionEvidence'

import type {
  FlashContradictionSemanticCandidate,
} from '@/lib/flash/semanticEvidence/contradictionSemanticComparison'

import {
  buildFlashContradictionSemanticPrompt,
  createFlashContradictionSemanticProducer,
  runFlashContradictionSemanticProducer,
} from '@/lib/flash/semanticEvidence/contradictionSemanticProducer'

import {
  FlashSemanticEvidenceProducerError,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

function candidate(
  overrides:
    Partial<
      FlashContradictionSemanticCandidate
    > = {},
): FlashContradictionSemanticCandidate {
  return {
    id:
      'contradiction:claim-1:100:200',

    subjectId:
      'claim-1',

    subjectText:
      'Tratamentul reduce mortalitatea.',

    firstPosition: {
      citationId:
        100,

      evidenceRef:
        'source-100:paragraph-4',

      evidenceText:
        'Studiul raportează o reducere semnificativă a mortalității.',
    },

    secondPosition: {
      citationId:
        200,

      evidenceRef:
        'source-200:paragraph-7',

      evidenceText:
        'Analiza nu a identificat o reducere a mortalității.',
    },

    ...overrides,
  }
}

function executorReturning(
  raw:
    string,
): {
  executor:
    FlashSemanticTextExecutor

  mock:
    ReturnType<typeof vi.fn>
} {
  const mock =
    vi.fn(
      async () =>
        raw,
    )

  return {
    executor:
      mock,

    mock,
  }
}

function producerWith(
  executor:
    FlashSemanticTextExecutor,
  overrides: {
    provider?:
      string

    model?:
      string
  } = {},
) {
  return createFlashContradictionSemanticProducer({
    executor,

    provider:
      overrides.provider ??
      'test-provider',

    model:
      overrides.model ??
      'test-model',
  })
}

describe(
  'Flash contradiction semantic producer',
  () => {
    it(
      'builds a prompt that exposes evidence text but not trusted citation locators',
      () => {
        const prompt =
          buildFlashContradictionSemanticPrompt([
            candidate(),
          ])

        expect(
          prompt.userPrompt,
        ).toContain(
          'Tratamentul reduce mortalitatea.',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          'Studiul raportează o reducere semnificativă a mortalității.',
        )

        expect(
          prompt.userPrompt,
        ).not.toContain(
          'source-100:paragraph-4',
        )

        expect(
          prompt.userPrompt,
        ).not.toContain(
          '"citationId"',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT decide which source is more trustworthy or authoritative.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT decide AUTO, REVIEW, BLOCK',
        )
      },
    )

    it(
      'does not call the model when a complete candidate set is empty',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"cases":[]}',
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-1',

              candidateSetComplete:
                true,

              candidates:
                [],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.evidence,
        ).toEqual({
          cases:
            [],
        })

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'maps a model-classified material conflict onto trusted candidate anchors',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction:claim-1:100:200',

                  relation:
                    'materialConflict',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-2',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.evidence
            .cases[0],
        ).toEqual({
          id:
            'contradiction:claim-1:100:200',

          subjectId:
            'claim-1',

          firstPosition: {
            citationId:
              100,

            evidenceRef:
              'source-100:paragraph-4',
          },

          secondPosition: {
            citationId:
              200,

            evidenceRef:
              'source-200:paragraph-7',
          },

          relation:
            'materialConflict',

          comparable:
            true,

          material:
            true,
        })

        const evaluated =
          evaluateFlashContradictions(
            result.evidence,
          )

        expect(
          evaluated
            .materialContradictions,
        ).toBe(true)
      },
    )

    it(
      'preserves contestation without converting it to material contradiction',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction:claim-1:100:200',

                  relation:
                    'contestation',

                  comparable:
                    true,

                  material:
                    true,
                },
              ],
            }),
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-3',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        const evaluated =
          evaluateFlashContradictions(
            result.evidence,
          )

        expect(
          evaluated
            .materialContradictions,
        ).toBe(false)

        expect(
          evaluated
            .articleDisclosureSuggested,
        ).toBe(true)
      },
    )

    it(
      'rejects incomplete semantic output rather than silently dropping a candidate',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            '{"cases":[]}',
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-4',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
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
        })
      },
    )

    it(
      'rejects a model attempt to introduce trusted locator fields',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction:claim-1:100:200',

                  relation:
                    'materialConflict',

                  comparable:
                    true,

                  material:
                    true,

                  citationId:
                    999,
                },
              ],
            }),
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-5',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_output',
        })
      },
    )

    it(
      'fails conservatively when the upstream candidate set is incomplete',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"cases":[]}',
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-6',

              candidateSetComplete:
                false,

              candidates:
                [],
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
            'invalid_input',
        })

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects duplicate trusted candidate ids before invoking the model',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"cases":[]}',
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-7',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
                candidate(),
              ],
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_input',
        })

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects an empty run id before invoking the model',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"cases":[]}',
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                '   ',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_input',
        })

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'preserves run metadata for the specialized producer',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              cases: [
                {
                  id:
                    'contradiction:claim-1:100:200',

                  relation:
                    'contextDifference',

                  comparable:
                    false,

                  material:
                    false,
                },
              ],
            }),
          )

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                ' contradiction-run-8 ',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
            },
          })

        expect(
          result.ok,
        ).toBe(true)

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.run,
        ).toEqual({
          kind:
            'contradictions',

          method:
            'model',

          runId:
            'contradiction-run-8',

          provider:
            'test-provider',

          model:
            'test-model',
        })
      },
    )

    it(
      'maps controlled provider failure without creating evidence',
      async () => {
        const executor:
          FlashSemanticTextExecutor =
          async () => {
            throw new FlashSemanticEvidenceProducerError(
              'provider_error',
            )
          }

        const result =
          await runFlashContradictionSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              runId:
                'contradiction-run-9',

              candidateSetComplete:
                true,

              candidates: [
                candidate(),
              ],
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
  },
)
