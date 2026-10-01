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
  evaluateFlashRuntimeWithProducedSafetyByIdReadOnly,
  type FlashRuntimeSemanticEvidenceWithoutSafety,
} from '@/lib/flash/semanticEvidence/payloadSafetyRuntimeReadOnly'

import {
  createFlashSafetySemanticProducer,
} from '@/lib/flash/semanticEvidence/safetySemanticProducer'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

type WrapperPayload =
  Parameters<
    typeof evaluateFlashRuntimeWithProducedSafetyByIdReadOnly
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
        'Instrucțiunea analizată este periculoasă.',
      ),

    surseFlash:
      [],

    informationStatus:
      'confirmed',

    riskLevel:
      'low',

    isHealthRelated:
      false,

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
          /**
           * Dedup evaluator:
           * candidatul se ignoră pe sine.
           */
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

function otherSemanticEvidence():
  FlashRuntimeSemanticEvidenceWithoutSafety {
  return {
    factualSupport:
      null,

    contradictions:
      null,

    medicalInterpretation:
      null,

    extraordinaryClaim:
      null,

    regulatoryStatus:
      null,
  }
}

function safetyOutput({
  dangerous =
    false,
}: {
  dangerous?:
    boolean
} = {}) {
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
    ],
  })
}

function safetyProducer(
  raw:
    string,
) {
  const executor:
    FlashSemanticTextExecutor =
      async () =>
        raw

  return createFlashSafetySemanticProducer({
    executor,

    provider:
      'test-provider',

    model:
      'test-model',
  })
}

describe(
  'Flash Payload produced Safety runtime wrapper',
  () => {
    it(
      'builds SemanticDocument and injects successful Safety evidence into the existing runtime orchestrator',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSafetyByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'payload-safety-1',

            safetyProducer:
              safetyProducer(
                safetyOutput(),
              ),

            semanticEvidence:
              otherSemanticEvidence(),
          })

        expect(
          result.semanticDocument,
        ).toMatchObject({
          flashId:
            1,

          language:
            'ro',

          title:
            'Flash semantic runtime',

          bodyText:
            'Instrucțiunea analizată este periculoasă.',
        })

        expect(
          result.safetyProduction.ok,
        ).toBe(true)

        expect(
          result.runtime
            .safety,
        ).not.toBeNull()

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'safety',
        )
      },
    )

    it(
      'preserves an anchored dangerous instruction through the full runtime path to BLOCK',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSafetyByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'payload-safety-2',

            safetyProducer:
              safetyProducer(
                safetyOutput({
                  dangerous:
                    true,
                }),
              ),

            semanticEvidence:
              otherSemanticEvidence(),
          })

        expect(
          result.safetyProduction.ok,
        ).toBe(true)

        expect(
          result.runtime
            .safety
            ?.decisionEvidence,
        ).toMatchObject({
          dangerousInstructions:
            true,

          safetyGateTriggered:
            false,
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
      'turns a Safety producer failure into missing runtime evidence instead of a false PASS',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSafetyByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'payload-safety-3',

            safetyProducer:
              safetyProducer(
                '{"findings":[]}',
              ),

            semanticEvidence:
              otherSemanticEvidence(),
          })

        expect(
          result.safetyProduction,
        ).toMatchObject({
          ok:
            false,

          evidence:
            null,

          reason:
            'invalid_output',
        })

        expect(
          result.runtime
            .safety,
        ).toBeNull()

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
            .decision
            .decision,
        ).toBe(
          'review',
        )
      },
    )
  },
)
