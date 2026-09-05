import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  validateFlashFactualProvenance,
} from '@/lib/flash/runtimeEvidence/factualSupportProvenance'

import type {
  FlashFactualSourceChunk,
} from '@/lib/flash/semanticEvidence/factualSourceChunks'

import {
  buildFlashFactualVerificationSemanticPrompt,
  createFlashFactualVerificationSemanticProducer,
  runFlashFactualVerificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/factualVerificationSemanticProducer'

import {
  FlashSemanticEvidenceProducerError,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

const claims = [
  {
    id:
      'claim-1',

    text:
      'Studiul a inclus 500 de participanți.',
  },
]

function chunks():
  FlashFactualSourceChunk[] {
  return [
    {
      citationId:
        'source-row-1',

      chunkIndex:
        0,

      chunkId:
        'chunk-a',

      evidenceRef:
        'source-row-1:chunk:0:aaaa',

      evidenceText:
        'Studiul a inclus 500 de participanți.',
    },
    {
      citationId:
        'source-row-2',

      chunkIndex:
        0,

      chunkId:
        'chunk-b',

      evidenceRef:
        'source-row-2:chunk:0:bbbb',

      evidenceText:
        'Studiul a inclus 450 de participanți.',
    },
  ]
}

function executorReturning(
  raw:
    string,
): {
  executor:
    FlashSemanticTextExecutor

  mock:
    ReturnType<
      typeof vi.fn
    >
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
  return createFlashFactualVerificationSemanticProducer({
    executor,

    provider:
      overrides.provider ??
      'test-provider',

    model:
      overrides.model ??
      'test-model',
  })
}

function input(
  overrides: {
    runId?:
      string

    generationRunId?:
      string

    evidenceSetComplete?:
      boolean

    claims?:
      typeof claims

    chunks?:
      FlashFactualSourceChunk[]
  } = {},
) {
  return {
    runId:
      overrides.runId ??
      'verification-run-1',

    generationRunId:
      overrides.generationRunId ??
      'generation-run-1',

    evidenceSetComplete:
      overrides.evidenceSetComplete ??
      true,

    claims:
      overrides.claims ??
      claims,

    chunks:
      overrides.chunks ??
      chunks(),
  }
}

describe(
  'Flash factual verification semantic producer',
  () => {
    it(
      'builds a prompt with claim/chunk text but without trusted provenance locators',
      () => {
        const prompt =
          buildFlashFactualVerificationSemanticPrompt({
            claims,

            chunks:
              chunks(),
          })

        expect(
          prompt.userPrompt,
        ).toContain(
          'Studiul a inclus 500 de participanți.',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"chunkId": "chunk-a"',
        )

        expect(
          prompt.userPrompt,
        ).toContain(
          '"chunkIndex": 0',
        )

        expect(
          prompt.userPrompt,
        ).not.toContain(
          '"citationId"',
        )

        expect(
          prompt.userPrompt,
        ).not.toContain(
          '"evidenceRef"',
        )

        expect(
          prompt.userPrompt,
        ).not.toContain(
          'source-row-1:chunk:0:aaaa',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'exactly one check for every supplied chunk occurrence',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT return supportStatus.',
        )

        expect(
          prompt.systemPrompt,
        ).toContain(
          'Do NOT decide AUTO, REVIEW, BLOCK',
        )
      },
    )

    it(
      'does not call the model when the complete claim set is empty',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                claims:
                  [],
              }),
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.provenance,
        ).toEqual({
          claims:
            [],

          verifications:
            [],
        })

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'derives unverifiable without calling the model when a complete evidence set has zero chunks',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                chunks:
                  [],
              }),
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.provenance
            .verifications[0]
            ?.supportStatus,
        ).toBe(
          'unverifiable',
        )

        expect(
          validateFlashFactualProvenance(
            result.provenance,
          ).valid,
        ).toBe(
          true,
        )

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'runs complete claim-by-chunk verification and reconstructs trusted anchors',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            JSON.stringify({
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                    {
                      chunkId:
                        'chunk-b',

                      chunkIndex:
                        0,

                      verdict:
                        'contradicts',
                    },
                  ],
                },
              ],
            }),
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input(),
          })

        expect(
          result.ok,
        ).toBe(
          true,
        )

        if (!result.ok) {
          throw new Error(
            'Expected success',
          )
        }

        expect(
          result.run,
        ).toEqual({
          stage:
            'factualVerification',

          method:
            'model',

          runId:
            'verification-run-1',

          generationRunId:
            'generation-run-1',

          provider:
            'test-provider',

          model:
            'test-model',
        })

        expect(
          result.provenance
            .verifications[0],
        ).toMatchObject({
          claimId:
            'claim-1',

          supportStatus:
            'contradicted',

          method:
            'separateModelPass',

          generationRunId:
            'generation-run-1',

          verificationRunId:
            'verification-run-1',

          citationChecks: [
            {
              citationId:
                'source-row-1',

              verdict:
                'supports',

              evidenceRef:
                'source-row-1:chunk:0:aaaa',
            },
            {
              citationId:
                'source-row-2',

              verdict:
                'contradicts',

              evidenceRef:
                'source-row-2:chunk:0:bbbb',
            },
          ],
        })

        expect(
          validateFlashFactualProvenance(
            result.provenance,
          ).valid,
        ).toBe(
          true,
        )

        expect(
          mock,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          mock,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            runId:
              'verification-run-1',
          }),
        )
      },
    )

    it(
      'rejects an incomplete evidence set before calling the model',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                evidenceSetComplete:
                  false,
              }),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
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
      'rejects missing or identical generation and verification run ids before calling the model',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const missing =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                generationRunId:
                  '   ',
              }),
          })

        expect(
          missing,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_input',
        })

        const same =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                generationRunId:
                  'verification-run-1',
              }),
          })

        expect(
          same,
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
      'rejects duplicate trusted claim ids before calling the model',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                claims: [
                  claims[0],
                  claims[0],
                ],
              }),
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
      'rejects duplicate trusted chunk occurrences before calling the model',
      async () => {
        const sourceChunks =
          chunks()

        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input({
                chunks: [
                  sourceChunks[0],
                  sourceChunks[0],
                ],
              }),
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
      'rejects incomplete semantic coverage instead of silently accepting missing checks',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                  ],
                },
              ],
            }),
          )

        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
              ),

            input:
              input(),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
            null,

          reason:
            'invalid_output',
        })
      },
    )

    it(
      'returns configuration_error for blank provider or model',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            '{"claims":[]}',
          )

        const blankProvider =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
                {
                  provider:
                    '   ',
                },
              ),

            input:
              input(),
          })

        expect(
          blankProvider,
        ).toMatchObject({
          ok:
            false,

          reason:
            'configuration_error',
        })

        const blankModel =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                executor,
                {
                  model:
                    '   ',
                },
              ),

            input:
              input(),
          })

        expect(
          blankModel,
        ).toMatchObject({
          ok:
            false,

          reason:
            'configuration_error',
        })

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'preserves provider_error from the injected executor',
      async () => {
        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                async () => {
                  throw new FlashSemanticEvidenceProducerError(
                    'provider_error',
                  )
                },
              ),

            input:
              input(),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
            null,

          reason:
            'provider_error',
        })
      },
    )

    it(
      'converts unexpected executor failures to execution_error',
      async () => {
        const result =
          await runFlashFactualVerificationSemanticProducer({
            producer:
              producerWith(
                async () => {
                  throw new Error(
                    'unexpected',
                  )
                },
              ),

            input:
              input(),
          })

        expect(
          result,
        ).toMatchObject({
          ok:
            false,

          provenance:
            null,

          reason:
            'execution_error',
        })
      },
    )
  },
)
