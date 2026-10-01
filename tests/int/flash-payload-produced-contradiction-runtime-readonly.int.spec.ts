import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import type {
  FlashExtraordinaryClaimEvidenceInput,
} from '@/lib/flash/runtimeEvidence/extraordinaryClaimEvidence'

import type {
  FlashFactualProvenanceInput,
} from '@/lib/flash/runtimeEvidence/factualSupportProvenance'

import type {
  FlashMedicalInterpretationEvidenceInput,
} from '@/lib/flash/runtimeEvidence/medicalInterpretationEvidence'

import type {
  FlashRegulatoryStatusEvidenceInput,
} from '@/lib/flash/runtimeEvidence/regulatoryStatusEvidence'

import type {
  FlashSafetyEvidenceInput,
} from '@/lib/flash/runtimeEvidence/safetyEvidence'

import type {
  FlashContradictionEvidenceTextResolver,
} from '@/lib/flash/semanticEvidence/contradictionCandidateBridge'

import {
  createFlashContradictionSemanticProducer,
} from '@/lib/flash/semanticEvidence/contradictionSemanticProducer'

import {
  evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly,
} from '@/lib/flash/semanticEvidence/payloadProducedSemanticRuntimeReadOnly'

import type {
  FlashSemanticEvidenceProducer,
  FlashSemanticEvidenceProducerDescriptor,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

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
      'Flash contradiction runtime',

    slug:
      'flash-contradiction-runtime',

    limba:
      'ro',

    versiuneAlternativa:
      2,

    pilon:
      1,

    flashType:
      'research',

    excerpt:
      'Material factual pentru evaluare.',

    continut:
      lexicalContent(
        'Tratamentul reduce mortalitatea.',
      ),

    surseFlash:
      [],

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

    disclaimerTypes:
      [],

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    eventFingerprint:
      'contradiction-runtime-event',

    sourceFingerprint:
      'contradiction-runtime-source',

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
        'flash-contradiction-runtime-en',

      versiuneAlternativa:
        1,

      eventFingerprint:
        'contradiction-runtime-event-en',

      sourceFingerprint:
        'contradiction-runtime-source-en',
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

function fixedProducer<
  TEvidence,
>(
  kind:
    FlashSemanticEvidenceProducerDescriptor['kind'],
  evidence:
    TEvidence,
): FlashSemanticEvidenceProducer<
  TEvidence
> {
  return {
    descriptor: {
      kind,

      method:
        'deterministic',

      provider:
        null,

      model:
        null,
    },

    async produce() {
      return evidence
    },
  }
}

function safetyProducer() {
  return fixedProducer<
    FlashSafetyEvidenceInput
  >(
    'safety',
    {
      findings:
        [],
    },
  )
}

function medicalProducer() {
  return fixedProducer<
    FlashMedicalInterpretationEvidenceInput
  >(
    'medicalInterpretation',
    {
      findings:
        [],
    },
  )
}

function extraordinaryProducer() {
  return fixedProducer<
    FlashExtraordinaryClaimEvidenceInput
  >(
    'extraordinaryClaim',
    {
      findings:
        [],
    },
  )
}

function regulatoryProducer() {
  return fixedProducer<
    FlashRegulatoryStatusEvidenceInput
  >(
    'regulatoryStatus',
    {
      regulatoryContextRelevant:
        false,

      findings:
        [],
    },
  )
}

function contradictionProducer(
  raw:
    string,
) {
  return createFlashContradictionSemanticProducer({
    executor:
      async () =>
        raw,

    provider:
      'test-provider',

    model:
      'test-model',
  })
}

function factualProvenanceWithConflict():
  FlashFactualProvenanceInput {
  return {
    claims: [
      {
        id:
          'claim-1',

        text:
          'Tratamentul reduce mortalitatea.',

        citationIds: [
          100,
          200,
        ],
      },
    ],

    verifications: [
      {
        claimId:
          'claim-1',

        supportStatus:
          'contradicted',

        method:
          'deterministic',

        citationChecks: [
          {
            citationId:
              100,

            verdict:
              'supports',

            evidenceRef:
              'source-100:paragraph-4',
          },
          {
            citationId:
              200,

            verdict:
              'contradicts',

            evidenceRef:
              'source-200:paragraph-7',
          },
        ],
      },
    ],
  }
}

function factualProvenanceWithoutConflict():
  FlashFactualProvenanceInput {
  return {
    claims: [
      {
        id:
          'claim-1',

        text:
          'Tratamentul reduce mortalitatea.',

        citationIds: [
          100,
        ],
      },
    ],

    verifications: [
      {
        claimId:
          'claim-1',

        supportStatus:
          'supported',

        method:
          'deterministic',

        citationChecks: [
          {
            citationId:
              100,

            verdict:
              'supports',

            evidenceRef:
              'source-100:paragraph-4',
          },
        ],
      },
    ],
  }
}

function contradictionResolver({
  resolveSecond =
    true,
}: {
  resolveSecond?:
    boolean
} = {}):
  FlashContradictionEvidenceTextResolver {
  return async ({
    citationId,
  }) => {
    if (
      String(
        citationId,
      ) ===
      '100'
    ) {
      return 'Studiul raportează o reducere semnificativă a mortalității.'
    }

    if (
      String(
        citationId,
      ) ===
        '200' &&
      resolveSecond
    ) {
      return 'Analiza nu a identificat o reducere a mortalității.'
    }

    return null
  }
}

function baseSemanticProducers() {
  return {
    safetyProducer:
      safetyProducer(),

    medicalInterpretationProducer:
      medicalProducer(),

    extraordinaryClaimProducer:
      extraordinaryProducer(),

    regulatoryStatusProducer:
      regulatoryProducer(),
  }
}

describe(
  'Flash Payload produced Contradiction runtime integration',
  () => {
    it(
      'produces a material contradiction from the same factual provenance supplied to runtime',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'contradiction-runtime-1',

            ...baseSemanticProducers(),

            contradictionProducer:
              contradictionProducer(
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
              ),

            contradictionEvidenceTextResolver:
              contradictionResolver(),

            semanticEvidence: {
              factualSupport:
                factualProvenanceWithConflict(),
            },
          })

        expect(
          result.contradictionBridge,
        ).toMatchObject({
          complete:
            true,

          reasons:
            [],
        })

        expect(
          result.contradictionBridge
            ?.candidates,
        ).toHaveLength(
          1,
        )

        expect(
          result.contradictionProduction?.ok,
        ).toBe(true)

        expect(
          result.runtime
            .contradictions
            ?.decisionEvidence,
        ).toEqual({
          materialContradictions:
            true,
        })

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'contradictions',
        )
      },
    )

    it(
      'keeps Contradictions unavailable when evidence text resolution is incomplete',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'contradiction-runtime-2',

            ...baseSemanticProducers(),

            contradictionProducer:
              contradictionProducer(
                '{"cases":[]}',
              ),

            contradictionEvidenceTextResolver:
              contradictionResolver({
                resolveSecond:
                  false,
              }),

            semanticEvidence: {
              factualSupport:
                factualProvenanceWithConflict(),
            },
          })

        expect(
          result.contradictionBridge,
        ).toMatchObject({
          complete:
            false,

          reasons: [
            'unresolved_evidence_text',
          ],
        })

        expect(
          result.contradictionProduction,
        ).toBeNull()

        expect(
          result.runtime
            .contradictions,
        ).toBeNull()

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toContain(
          'contradictions',
        )
      },
    )

    it(
      'treats a complete candidate set with no opposing evidence as a completed Contradictions run',
      async () => {
        const resolver =
          vi.fn(
            async () =>
              'Evidence.',
          )

        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'contradiction-runtime-3',

            ...baseSemanticProducers(),

            contradictionProducer:
              contradictionProducer(
                'THIS_OUTPUT_MUST_NOT_BE_USED',
              ),

            contradictionEvidenceTextResolver:
              resolver,

            semanticEvidence: {
              factualSupport:
                factualProvenanceWithoutConflict(),
            },
          })

        expect(
          result.contradictionBridge,
        ).toMatchObject({
          complete:
            true,

          candidates:
            [],
        })

        expect(
          result.contradictionProduction,
        ).toMatchObject({
          ok:
            true,

          evidence: {
            cases:
              [],
          },
        })

        expect(
          resolver,
        ).not.toHaveBeenCalled()

        expect(
          result.runtime
            .contradictions
            ?.decisionEvidence,
        ).toEqual({
          materialContradictions:
            false,
        })

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).not.toContain(
          'contradictions',
        )
      },
    )

    it(
      'isolates Contradiction producer failure from the other four semantic productions',
      async () => {
        const result =
          await evaluateFlashRuntimeWithProducedSemanticEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'contradiction-runtime-4',

            ...baseSemanticProducers(),

            contradictionProducer:
              contradictionProducer(
                '{"cases":[]}',
              ),

            contradictionEvidenceTextResolver:
              contradictionResolver(),

            semanticEvidence: {
              factualSupport:
                factualProvenanceWithConflict(),
            },
          })

        expect(
          result.contradictionBridge
            ?.complete,
        ).toBe(true)

        expect(
          result.contradictionProduction,
        ).toMatchObject({
          ok:
            false,

          reason:
            'invalid_output',
        })

        expect(
          result.safetyProduction.ok,
        ).toBe(true)

        expect(
          result.medicalInterpretationProduction.ok,
        ).toBe(true)

        expect(
          result.extraordinaryClaimProduction.ok,
        ).toBe(true)

        expect(
          result.regulatoryStatusProduction.ok,
        ).toBe(true)

        expect(
          result.runtime
            .contradictions,
        ).toBeNull()

        expect(
          result.runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toContain(
          'contradictions',
        )
      },
    )
  },
)
