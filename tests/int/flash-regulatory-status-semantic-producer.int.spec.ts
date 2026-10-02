import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashRegulatoryStatusDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/regulatoryStatusDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import {
  buildFlashRegulatoryStatusSemanticPrompt,
  createFlashRegulatoryStatusSemanticProducer,
} from '@/lib/flash/semanticEvidence/regulatoryStatusSemanticProducer'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

function document():
  FlashSemanticDocument {
  return {
    flashId:
      1,

    language:
      'ro',

    title:
      'Compania anunță lansarea unui nou sistem medical',

    excerpt:
      'Produsul este evaluat pentru utilizare clinică.',

    bodyText:
      [
        'Compania a prezentat noi rezultate clinice.',
        '',
        'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
      ].join('\n'),

    metadata: {
      flashType:
        'product',

      informationStatus:
        'confirmed',

      riskLevel:
        'low',

      isHealthRelated:
        true,

      medicalEvidenceType:
        'productOrCompanyClaim',

      clinicalValidationStatus:
        'authorizedOrApproved',
    },
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
  return createFlashRegulatoryStatusSemanticProducer({
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
  'Flash regulatory status semantic producer',
  () => {
    it(
      'builds a deterministic prompt that does not infer relevance from medical context alone',
      () => {
        const first =
          buildFlashRegulatoryStatusSemanticPrompt(
            document(),
          )

        const second =
          buildFlashRegulatoryStatusSemanticPrompt(
            document(),
          )

        expect(
          first,
        ).toEqual(
          second,
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'Do NOT infer regulatory relevance merely because:',
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'the document is medical or clinical',
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'There is NO requirement to return one finding for every type.',
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'You do NOT decide whether the document should be published.',
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'exact verbatim substring',
        )
      },
    )

    it(
      'accepts irrelevant regulatory context with no findings',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                false,

              findings:
                [],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-1',
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
          regulatoryContextRelevant:
            false,

          findings:
            [],
        })

        expect(
          result.run,
        ).toMatchObject({
          kind:
            'regulatoryStatus',

          method:
            'model',

          provider:
            'test-provider',

          model:
            'test-model',

          runId:
            'regulatory-run-1',
        })

        expect(
          mock,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'accepts relevant context without findings and leaves runtime to require REVIEW',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings:
                [],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-2',
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

        const decisionEvidence =
          buildFlashRegulatoryStatusDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          decisionEvidence
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'regulatory_context_without_status_evidence',
        )
      },
    )

    it(
      'anchors clear regulatory evidence and preserves a supported clear status',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
                },
              ],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-3',
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

        const decisionEvidence =
          buildFlashRegulatoryStatusDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            false,
        })

        expect(
          decisionEvidence
            .regulatoryStatusEvidence
            .evaluatedFindings[0],
        ).toMatchObject({
          evidencePresent:
            true,

          clearAndSupported:
            true,

          reviewRequired:
            false,
        })
      },
    )

    it(
      'keeps clear status with invented evidence conservative at REVIEW',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a aprobat produsul fără nicio limitare.',
                },
              ],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-4',
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

        const decisionEvidence =
          buildFlashRegulatoryStatusDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          decisionEvidence
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'clear_regulatory_status_without_evidence',
        )
      },
    )

    it(
      'preserves unclear regulatory status as REVIEW evidence',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-jurisdiction',

                  type:
                    'jurisdictionApplicability',

                  verdict:
                    'unclear',

                  evidenceText:
                    null,
                },
              ],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-5',
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

        const decisionEvidence =
          buildFlashRegulatoryStatusDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          decisionEvidence
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'regulatory_status_unclear',
        )
      },
    )

    it(
      'rejects findings when regulatory context is declared irrelevant',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                false,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
                },
              ],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-6',
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
      'accepts multiple findings of the same regulatory type',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
                },
                {
                  id:
                    'approval-eu',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'unclear',

                  evidenceText:
                    null,
                },
              ],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-7',
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
            .findings,
        ).toHaveLength(
          2,
        )
      },
    )

    it(
      'rejects invalid JSON through the strict parser',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            '```json\n{"regulatoryContextRelevant":false,"findings":[]}\n```',
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-8',
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
      'reports missing provider configuration without invoking the executor',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            JSON.stringify({
              regulatoryContextRelevant:
                false,

              findings:
                [],
            }),
          )

        const result =
          await runFlashSemanticEvidenceProducer({
            producer:
              producerWith(
                executor,
                {
                  provider:
                    '   ',
                },
              ),

            input: {
              document:
                document(),

              runId:
                'regulatory-run-9',
            },
          })

        expect(
          result,
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
  },
)
