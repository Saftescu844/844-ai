import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashExtraordinaryClaimDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/extraordinaryClaimDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import {
  buildFlashExtraordinaryClaimSemanticPrompt,
  createFlashExtraordinaryClaimSemanticProducer,
} from '@/lib/flash/semanticEvidence/extraordinaryClaimSemanticProducer'

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
      'Compania anunță rezultate spectaculoase',

    excerpt:
      'Tehnologia este prezentată drept o schimbare majoră.',

    bodyText:
      [
        'Rezultatele provin dintr-un studiu preliminar.',
        '',
        'Compania afirmă că sistemul vindecă toate cazurile fără excepție.',
      ].join('\n'),

    metadata: {
      flashType:
        'research',

      informationStatus:
        'preliminary',

      riskLevel:
        'low',

      isHealthRelated:
        true,

      medicalEvidenceType:
        'clinicalStudy',

      clinicalValidationStatus:
        'underEvaluation',
    },
  }
}

function cleanOutput() {
  return JSON.stringify({
    findings: [
      {
        id:
          'extraordinary-breakthrough-cure',

        type:
          'breakthroughOrCureClaim',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'extraordinary-near-perfect-performance',

        type:
          'nearPerfectPerformance',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'extraordinary-broad-universal-effect',

        type:
          'broadOrUniversalEffect',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'extraordinary-replacement-established-practice',

        type:
          'replacementOfEstablishedPractice',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'extraordinary-unprecedented-capability',

        type:
          'unprecedentedCapability',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'extraordinary-other',

        type:
          'otherExtraordinaryClaim',

        verdict:
          'absent',

        evidenceText:
          null,
      },
    ],
  })
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
  return createFlashExtraordinaryClaimSemanticProducer({
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
  'Flash extraordinary claim semantic producer',
  () => {
    it(
      'builds a deterministic prompt without treating sensational wording as sufficient',
      () => {
        const first =
          buildFlashExtraordinaryClaimSemanticPrompt(
            document(),
          )

        const second =
          buildFlashExtraordinaryClaimSemanticPrompt(
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
          'Sensational, enthusiastic, novel, or promotional wording alone does NOT automatically make a claim extraordinary.',
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'You do NOT decide whether the claim is true.',
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
      'runs a complete all-absent assessment through the common producer contract',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            cleanOutput(),
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
                'extraordinary-run-1',
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
          6,
        )

        expect(
          result.run,
        ).toMatchObject({
          kind:
            'extraordinaryClaim',

          method:
            'model',

          provider:
            'test-provider',

          model:
            'test-model',

          runId:
            'extraordinary-run-1',
        })

        expect(
          mock,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'anchors a present extraordinary claim and produces REVIEW evidence',
      async () => {
        const output =
          JSON.parse(
            cleanOutput(),
          )

        output.findings[0] = {
          id:
            'extraordinary-breakthrough-cure',

          type:
            'breakthroughOrCureClaim',

          verdict:
            'present',

          evidenceText:
            'vindecă toate cazurile fără excepție',
        }

        const {
          executor,
        } =
          executorReturning(
            JSON.stringify(
              output,
            ),
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
                'extraordinary-run-2',
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
          buildFlashExtraordinaryClaimDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            true,
        })

        expect(
          decisionEvidence
            .extraordinaryClaimEvidence
            .evaluatedFindings[0],
        ).toMatchObject({
          confirmed:
            true,

          reviewRequired:
            true,
        })
      },
    )

    it(
      'keeps an unanchored present extraordinary claim at REVIEW without confirming it',
      async () => {
        const output =
          JSON.parse(
            cleanOutput(),
          )

        output.findings[4] = {
          id:
            'extraordinary-unprecedented-capability',

          type:
            'unprecedentedCapability',

          verdict:
            'present',

          evidenceText:
            'Fragment inventat de model.',
        }

        const {
          executor,
        } =
          executorReturning(
            JSON.stringify(
              output,
            ),
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
                'extraordinary-run-3',
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
          buildFlashExtraordinaryClaimDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            true,
        })

        expect(
          decisionEvidence
            .extraordinaryClaimEvidence
            .evaluatedFindings[4],
        ).toMatchObject({
          confirmed:
            false,

          reviewRequired:
            true,
        })
      },
    )

    it(
      'does not infer extraordinary status when all findings are absent',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            cleanOutput(),
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
                'extraordinary-run-4',
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
          buildFlashExtraordinaryClaimDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          extraordinaryClaimNeedsReview:
            false,
        })
      },
    )

    it(
      'rejects an incomplete six-category assessment',
      async () => {
        const incomplete =
          JSON.parse(
            cleanOutput(),
          )

        incomplete.findings.pop()

        const {
          executor,
        } =
          executorReturning(
            JSON.stringify(
              incomplete,
            ),
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
                'extraordinary-run-5',
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
      'rejects duplicate extraordinary claim types even with unique ids',
      async () => {
        const duplicated =
          JSON.parse(
            cleanOutput(),
          )

        duplicated.findings[5] = {
          id:
            'different-id',

          type:
            'breakthroughOrCureClaim',

          verdict:
            'absent',

          evidenceText:
            null,
        }

        const {
          executor,
        } =
          executorReturning(
            JSON.stringify(
              duplicated,
            ),
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
                'extraordinary-run-6',
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
      'rejects evidence attached to an absent finding',
      async () => {
        const invalid =
          JSON.parse(
            cleanOutput(),
          )

        invalid.findings[0] = {
          id:
            'extraordinary-breakthrough-cure',

          type:
            'breakthroughOrCureClaim',

          verdict:
            'absent',

          evidenceText:
            'vindecă toate cazurile fără excepție',
        }

        const {
          executor,
        } =
          executorReturning(
            JSON.stringify(
              invalid,
            ),
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
                'extraordinary-run-7',
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
      'rejects invalid JSON through the strict parser',
      async () => {
        const {
          executor,
        } =
          executorReturning(
            '```json\n{"findings":[]}\n```',
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
                'extraordinary-run-8',
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
            cleanOutput(),
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
                'extraordinary-run-9',
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
