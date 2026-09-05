import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashSafetyDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/safetyDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import {
  buildFlashSafetySemanticPrompt,
  createFlashSafetySemanticProducer,
} from '@/lib/flash/semanticEvidence/safetySemanticProducer'

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
      'Flash despre siguranță',

    excerpt:
      'Material informativ pentru analiză.',

    bodyText:
      [
        'Context general.',
        '',
        'Instrucțiunea analizată este periculoasă.',
      ].join('\n'),

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

function safeOutput() {
  return JSON.stringify({
    findings: [
      {
        id:
          'safety-general',
        type:
          'generalSafetyConcern',
        verdict:
          'absent',
        evidenceText:
          null,
      },
      {
        id:
          'safety-individual-diagnosis',
        type:
          'individualDiagnosis',
        verdict:
          'absent',
        evidenceText:
          null,
      },
      {
        id:
          'safety-individual-treatment',
        type:
          'individualTreatmentRecommendation',
        verdict:
          'absent',
        evidenceText:
          null,
      },
      {
        id:
          'safety-medication-change',
        type:
          'medicationChange',
        verdict:
          'absent',
        evidenceText:
          null,
      },
      {
        id:
          'safety-dangerous-instructions',
        type:
          'dangerousInstructions',
        verdict:
          'absent',
        evidenceText:
          null,
      },
      {
        id:
          'safety-editorial-violation',
        type:
          'fundamentalEditorialViolation',
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
  return createFlashSafetySemanticProducer({
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
  'Flash safety semantic producer',
  () => {
    it(
      'builds a deterministic prompt without publication authority',
      () => {
        const first =
          buildFlashSafetySemanticPrompt(
            document(),
          )

        const second =
          buildFlashSafetySemanticPrompt(
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
          'You do NOT decide whether the document should be published.',
        )

        expect(
          first.systemPrompt,
        ).toContain(
          'exact verbatim substring',
        )

        expect(
          first.userPrompt,
        ).toContain(
          '"title": "Flash despre siguranță"',
        )

        expect(
          first.userPrompt,
        ).toContain(
          '"bodyText": "Context general.\\n\\nInstrucțiunea analizată este periculoasă."',
        )
      },
    )

    it(
      'runs through the common producer contract and returns safe evidence',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            safeOutput(),
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
                'safety-run-1',
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
          result.evidence
            .findings
            .every(
              finding =>
                finding.evidenceRef ===
                null,
            ),
        ).toBe(true)

        expect(
          result.run,
        ).toMatchObject({
          kind:
            'safety',

          method:
            'model',

          provider:
            'test-provider',

          model:
            'test-model',

          runId:
            'safety-run-1',
        })

        expect(
          mock,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          mock.mock.calls[0][0],
        ).toMatchObject({
          runId:
            'safety-run-1',
        })
      },
    )

    it(
      'anchors a dangerous instruction and lets the deterministic evaluator confirm BLOCK evidence',
      async () => {
        const dangerousOutput =
          JSON.parse(
            safeOutput(),
          )

        dangerousOutput.findings[4] = {
          id:
            'safety-dangerous-instructions',

          type:
            'dangerousInstructions',

          verdict:
            'present',

          evidenceText:
            'Instrucțiunea analizată este periculoasă.',
        }

        const {
          executor,
        } =
          executorReturning(
            JSON.stringify(
              dangerousOutput,
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
                'safety-run-2',
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
          buildFlashSafetyDecisionEvidence(
            result.evidence,
          ).decisionEvidence

        expect(
          decisionEvidence,
        ).toMatchObject({
          safetyGateTriggered:
            false,

          dangerousInstructions:
            true,
        })
      },
    )

    it(
      'keeps an invented dangerous evidence fragment at REVIEW instead of confirmed BLOCK',
      async () => {
        const dangerousOutput =
          JSON.parse(
            safeOutput(),
          )

        dangerousOutput.findings[4] = {
          id:
            'safety-dangerous-instructions',

          type:
            'dangerousInstructions',

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
              dangerousOutput,
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
                'safety-run-3',
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
          buildFlashSafetyDecisionEvidence(
            result.evidence,
          ).decisionEvidence

        expect(
          decisionEvidence,
        ).toMatchObject({
          safetyGateTriggered:
            true,

          dangerousInstructions:
            false,
        })
      },
    )

    it(
      'rejects an incomplete six-category assessment',
      async () => {
        const incomplete =
          JSON.parse(
            safeOutput(),
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
                'safety-run-4',
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
      'rejects duplicate safety types even when ids are unique',
      async () => {
        const duplicated =
          JSON.parse(
            safeOutput(),
          )

        duplicated.findings[5] = {
          id:
            'different-id',

          type:
            'dangerousInstructions',

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
                'safety-run-5',
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
            safeOutput(),
          )

        invalid.findings[0] = {
          id:
            'safety-general',

          type:
            'generalSafetyConcern',

          verdict:
            'absent',

          evidenceText:
            'Context general.',
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
                'safety-run-6',
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
      'rejects invalid JSON through the existing strict parser',
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
                'safety-run-7',
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
      'reports missing provider configuration without calling the executor',
      async () => {
        const {
          executor,
          mock,
        } =
          executorReturning(
            safeOutput(),
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
                'safety-run-8',
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
