import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  buildFlashMedicalInterpretationDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/medicalInterpretationDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  runFlashSemanticEvidenceProducer,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

import {
  buildFlashMedicalInterpretationSemanticPrompt,
  createFlashMedicalInterpretationSemanticProducer,
} from '@/lib/flash/semanticEvidence/medicalInterpretationSemanticProducer'

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
      'Studiu clinic nou',

    excerpt:
      'Material medical pentru informare.',

    bodyText:
      [
        'Studiul a inclus 500 de participanți.',
        '',
        'Rezultatul poate avea relevanță clinică pentru pacienții cu boala X.',
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
          'medical-clinical-significance',

        type:
          'clinicalSignificance',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'medical-patient-applicability',

        type:
          'patientApplicability',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'medical-comparative-clinical-claim',

        type:
          'comparativeClinicalClaim',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'medical-benefit-risk',

        type:
          'benefitRiskInterpretation',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'medical-clinical-decision',

        type:
          'clinicalDecisionImplication',

        verdict:
          'absent',

        evidenceText:
          null,
      },
      {
        id:
          'medical-other-interpretation',

        type:
          'otherMedicalInterpretation',

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
  return createFlashMedicalInterpretationSemanticProducer({
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
  'Flash medical interpretation semantic producer',
  () => {
    it(
      'builds a deterministic prompt without inferring interpretation from health metadata',
      () => {
        const first =
          buildFlashMedicalInterpretationSemanticPrompt(
            document(),
          )

        const second =
          buildFlashMedicalInterpretationSemanticPrompt(
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
          'A document being health-related does NOT by itself mean that important medical interpretation is present.',
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
          '"isHealthRelated": true',
        )

        expect(
          first.userPrompt,
        ).toContain(
          '"medicalEvidenceType": "clinicalStudy"',
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
                'medical-run-1',
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
            'medicalInterpretation',

          method:
            'model',

          provider:
            'test-provider',

          model:
            'test-model',

          runId:
            'medical-run-1',
        })

        expect(
          mock,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      'anchors a present clinical interpretation and produces REVIEW evidence',
      async () => {
        const output =
          JSON.parse(
            cleanOutput(),
          )

        output.findings[0] = {
          id:
            'medical-clinical-significance',

          type:
            'clinicalSignificance',

          verdict:
            'present',

          evidenceText:
            'relevanță clinică',
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
                'medical-run-2',
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
          buildFlashMedicalInterpretationDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            true,
        })

        expect(
          decisionEvidence
            .medicalInterpretationEvidence
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
      'does not convert health-related metadata into interpretation when all findings are absent',
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
                'medical-run-3',
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
          buildFlashMedicalInterpretationDecisionEvidence(
            result.evidence,
          )

        expect(
          decisionEvidence
            .decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
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
                'medical-run-4',
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
      'rejects duplicate medical interpretation types even with unique ids',
      async () => {
        const duplicated =
          JSON.parse(
            cleanOutput(),
          )

        duplicated.findings[5] = {
          id:
            'different-id',

          type:
            'clinicalSignificance',

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
                'medical-run-5',
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
            'medical-clinical-significance',

          type:
            'clinicalSignificance',

          verdict:
            'absent',

          evidenceText:
            'relevanță clinică',
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
                'medical-run-6',
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
                'medical-run-7',
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
                'medical-run-8',
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
