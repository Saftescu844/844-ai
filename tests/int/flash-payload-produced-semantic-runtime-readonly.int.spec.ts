import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import {
  evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly,
  type FlashRuntimeSemanticEvidenceWithoutProducedComponents,
} from '@/lib/flash/semanticEvidence/payloadProducedSemanticRuntimeReadOnly'

import {
  createFlashMedicalInterpretationSemanticProducer,
} from '@/lib/flash/semanticEvidence/medicalInterpretationSemanticProducer'

import {
  createFlashSafetySemanticProducer,
} from '@/lib/flash/semanticEvidence/safetySemanticProducer'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

type WrapperPayload =
  Parameters<
    typeof evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly
  >[0]['payload']

function lexicalContent(
  text:
    string,
): FlashAi['continut'] {
  return {
    root: {
      type:
        'root',

      children: [
        {
          type:
            'paragraph',

          children: [
            {
              type:
                'text',

              text,

              detail:
                0,

              format:
                0,

              mode:
                'normal',

              style:
                '',

              version:
                1,
            },
          ],

          direction:
            null,

          format:
            '',

          indent:
            0,

          textFormat:
            0,

          textStyle:
            '',

          version:
            1,
        },
      ],

      direction:
        null,

      format:
        '',

      indent:
        0,

      version:
        1,
    },
  }
}

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id:
      1,

    titlu:
      'Flash semantic runtime',

    slug:
      'flash-semantic-runtime',

    limba:
      'ro',

    versiuneAlternativa:
      2,

    pilon:
      1,

    flashType:
      'research',

    excerpt:
      'Material pentru evaluare.',

    continut:
      lexicalContent(
        [
          'Instrucțiunea analizată este periculoasă.',
          '',
          'Rezultatul poate avea relevanță clinică pentru pacienții cu boala X.',
        ].join('\n'),
      ),

    surseFlash:
      [],

    informationStatus:
      'confirmed',

    riskLevel:
      'low',

    isHealthRelated:
      true,

    medicalEvidenceType:
      'clinicalStudy',

    clinicalValidationStatus:
      'underEvaluation',

    disclaimerTypes:
      [],

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    eventFingerprint:
      'semantic-runtime-event',

    sourceFingerprint:
      'semantic-runtime-source',

    generatAutomat:
      false,

    createdAt:
      '2026-09-05T08:00:00.000Z',

    updatedAt:
      '2026-09-05T08:00:00.000Z',

    _status:
      'draft',

    ...overrides,
  } as FlashAi
}

function payloadReader():
  WrapperPayload {
  const primary =
    flash()

  const alternative =
    flash({
      id:
        2,

      limba:
        'en',

      slug:
        'flash-semantic-runtime-en',

      versiuneAlternativa:
        1,

      eventFingerprint:
        'semantic-runtime-event-en',

      sourceFingerprint:
        'semantic-runtime-source-en',
    })

  const flashes =
    new Map<number, FlashAi>([
      [
        primary.id,
        primary,
      ],
      [
        alternative.id,
        alternative,
      ],
    ])

  const findByID =
    vi.fn(
      async ({
        collection,
        id,
      }: {
        collection:
          string

        id:
          number | string
      }) => {
        if (
          collection !==
          'flash-ai'
        ) {
          throw new Error(
            `Unexpected collection ${collection}`,
          )
        }

        const doc =
          flashes.get(
            Number(id),
          )

        if (!doc) {
          throw new Error(
            `Flash ${id} not found`,
          )
        }

        return doc
      },
    )

  const find =
    vi.fn(
      async ({
        collection,
      }: {
        collection:
          string
      }) => {
        if (
          collection ===
          'flash-ai'
        ) {
          return {
            docs: [
              primary,
            ],

            totalDocs:
              1,
          }
        }

        if (
          collection ===
          'surse'
        ) {
          return {
            docs:
              [],

            totalDocs:
              0,
          }
        }

        throw new Error(
          `Unexpected collection ${collection}`,
        )
      },
    )

  return {
    findByID,
    find,
  } as unknown as WrapperPayload
}

function remainingSemanticEvidence():
  FlashRuntimeSemanticEvidenceWithoutProducedComponents {
  return {
    factualSupport:
      null,

    contradictions:
      null,

    extraordinaryClaim:
      null,

    regulatoryStatus:
      null,
  }
}

function safetyFindings({
  dangerous =
    false,
}: {
  dangerous?:
    boolean
} = {}) {
  return [
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
        dangerous
          ? 'present'
          : 'absent',

      evidenceText:
        dangerous
          ? 'Instrucțiunea analizată este periculoasă.'
          : null,
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
  ]
}

function medicalFindings({
  important =
    false,
}: {
  important?:
    boolean
} = {}) {
  return [
    {
      id:
        'medical-clinical-significance',

      type:
        'clinicalSignificance',

      verdict:
        important
          ? 'present'
          : 'absent',

      evidenceText:
        important
          ? 'relevanță clinică'
          : null,
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
  ]
}

function executorReturning(
  raw:
    string,
): FlashSemanticTextExecutor {
  return async () =>
    raw
}

function safetyProducer(
  raw:
    string,
) {
  return createFlashSafetySemanticProducer({
    executor:
      executorReturning(
        raw,
      ),

    provider:
      'test-provider',

    model:
      'test-model',
  })
}

function medicalProducer(
  raw:
    string,
) {
  return createFlashMedicalInterpretationSemanticProducer({
    executor:
      executorReturning(
        raw,
      ),

    provider:
      'test-provider',

    model:
      'test-model',
  })
}

describe(
  'Flash Payload produced semantic runtime wrapper',
  () => {
    it(
      'produces both Safety and Medical evidence before the existing runtime orchestrator',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'semantic-runtime-1',

            safetyProducer:
              safetyProducer(
                JSON.stringify({
                  findings:
                    safetyFindings(),
                }),
              ),

            medicalInterpretationProducer:
              medicalProducer(
                JSON.stringify({
                  findings:
                    medicalFindings(),
                }),
              ),

            semanticEvidence:
              remainingSemanticEvidence(),
          })

        expect(
          result.safetyProduction.ok,
        ).toBe(true)

        expect(
          result.medicalInterpretationProduction.ok,
        ).toBe(true)

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'safety',
        )

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'medicalInterpretation',
        )

        expect(
          result.safetyProduction
            .run.runId,
        ).toBe(
          'semantic-runtime-1:safety',
        )

        expect(
          result
            .medicalInterpretationProduction
            .run.runId,
        ).toBe(
          'semantic-runtime-1:medicalInterpretation',
        )
      },
    )

    it(
      'preserves a Medical interpretation finding through the full runtime path to REVIEW',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'semantic-runtime-2',

            safetyProducer:
              safetyProducer(
                JSON.stringify({
                  findings:
                    safetyFindings(),
                }),
              ),

            medicalInterpretationProducer:
              medicalProducer(
                JSON.stringify({
                  findings:
                    medicalFindings({
                      important:
                        true,
                    }),
                }),
              ),

            semanticEvidence:
              remainingSemanticEvidence(),
          })

        expect(
          result.runtime
            .medicalInterpretation
            ?.decisionEvidence,
        ).toEqual({
          importantMedicalInterpretation:
            true,
        })

        expect(
          result.runtime
            .runtimeDecision
            .decision
            .decision,
        ).toBe(
          'review',
        )

        expect(
          result.runtime
            .runtimeDecision
            .decision
            .reasons,
        ).toContain(
          'important_medical_interpretation',
        )
      },
    )

    it(
      'preserves Safety BLOCK even when Medical evidence is clean',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'semantic-runtime-3',

            safetyProducer:
              safetyProducer(
                JSON.stringify({
                  findings:
                    safetyFindings({
                      dangerous:
                        true,
                    }),
                }),
              ),

            medicalInterpretationProducer:
              medicalProducer(
                JSON.stringify({
                  findings:
                    medicalFindings(),
                }),
              ),

            semanticEvidence:
              remainingSemanticEvidence(),
          })

        expect(
          result.runtime
            .runtimeDecision
            .decision
            .decision,
        ).toBe(
          'blocked',
        )

        expect(
          result.runtime
            .runtimeDecision
            .decision
            .reasons,
        ).toContain(
          'dangerous_instructions',
        )
      },
    )

    it(
      'keeps successful Safety evidence when Medical production fails',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'semantic-runtime-4',

            safetyProducer:
              safetyProducer(
                JSON.stringify({
                  findings:
                    safetyFindings(),
                }),
              ),

            medicalInterpretationProducer:
              medicalProducer(
                '{"findings":[]}',
              ),

            semanticEvidence:
              remainingSemanticEvidence(),
          })

        expect(
          result.safetyProduction.ok,
        ).toBe(true)

        expect(
          result.medicalInterpretationProduction,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_output',
        })

        expect(
          result.runtime.safety,
        ).not.toBeNull()

        expect(
          result.runtime
            .medicalInterpretation,
        ).toBeNull()

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'safety',
        )

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toContain(
          'medicalInterpretation',
        )

        expect(
          result.runtime
            .runtimeDecision
            .decision
            .decision,
        ).toBe(
          'review',
        )
      },
    )

    it(
      'keeps successful Medical evidence when Safety production fails',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'semantic-runtime-5',

            safetyProducer:
              safetyProducer(
                '{"findings":[]}',
              ),

            medicalInterpretationProducer:
              medicalProducer(
                JSON.stringify({
                  findings:
                    medicalFindings(),
                }),
              ),

            semanticEvidence:
              remainingSemanticEvidence(),
          })

        expect(
          result.safetyProduction,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_output',
        })

        expect(
          result.medicalInterpretationProduction.ok,
        ).toBe(true)

        expect(
          result.runtime.safety,
        ).toBeNull()

        expect(
          result.runtime
            .medicalInterpretation,
        ).not.toBeNull()

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toContain(
          'safety',
        )

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'medicalInterpretation',
        )

        expect(
          result.runtime
            .runtimeDecision
            .decision
            .decision,
        ).toBe(
          'review',
        )
      },
    )
  },
)
