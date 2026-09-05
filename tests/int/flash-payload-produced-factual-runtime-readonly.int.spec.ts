import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import {
  createFlashContradictionSemanticProducer,
} from '@/lib/flash/semanticEvidence/contradictionSemanticProducer'

import {
  createFlashFactualClaimExtractionSemanticProducer,
} from '@/lib/flash/semanticEvidence/factualClaimExtractionSemanticProducer'

import {
  createFlashFactualVerificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/factualVerificationSemanticProducer'

import {
  evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly,
} from '@/lib/flash/semanticEvidence/payloadProducedFactualRuntimeReadOnly'

import type {
  FlashSemanticTextExecutor,
} from '@/lib/flash/semanticEvidence/semanticTextExecutor'

type FactualRuntimeInput =
  Parameters<
    typeof evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly
  >[0]

type RuntimePayload =
  FactualRuntimeInput['payload']

const factualClaimText =
  'Studiul a inclus 500 de participanți.'

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id:
      1,

    titlu:
      factualClaimText,

    slug:
      'flash-factual-runtime-test',

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

    continut: {
      root: {
        type:
          'root',

        version:
          1,

        children: [
          {
            type:
              'paragraph',

            version:
              1,

            children: [
              {
                type:
                  'text',

                version:
                  1,

                text:
                  'Material factual pentru evaluare.',
              },
            ],
          },
        ],
      },
    } as unknown as FlashAi['continut'],

    informationStatus:
      'official',

    riskLevel:
      'low',

    isHealthRelated:
      false,

    disclaimerTypes:
      [],

    surseFlash: [
      {
        id:
          'source-row-1',

        sursa:
          100,

        url:
          'https://example.com/article',

        primary:
          true,
      },
    ],

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    eventFingerprint:
      'event-factual-runtime-test',

    sourceFingerprint:
      'source-factual-runtime-test',

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

function source(
  overrides:
    Partial<Surse> = {},
): Surse {
  return {
    id:
      100,

    nume:
      'Example',

    url:
      'https://example.com',

    sourceRole:
      'primary',

    editorialTrust:
      'high',

    citationMode:
      'paraphrase',

    allowIngestion:
      true,

    allowAutoPublish:
      true,

    nivelIncredere:
      'primar',

    tipCitarePermis:
      'parafrazare',

    permiteAutoGenerare:
      true,

    activa:
      true,

    createdAt:
      '2026-09-05T08:00:00.000Z',

    updatedAt:
      '2026-09-05T08:00:00.000Z',

    ...overrides,
  } as Surse
}

function payloadReader({
  primary =
    flash(),

  alternative =
    flash({
      id:
        2,

      limba:
        'en',

      versiuneAlternativa:
        1,

      slug:
        'flash-factual-runtime-test-en',
    }),

  sources = [
    source(),
  ],
}: {
  primary?:
    FlashAi

  alternative?:
    FlashAi

  sources?:
    Surse[]
} = {}): RuntimePayload {
  const flashes =
    new Map<
      number,
      FlashAi
    >([
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
            Number(
              id,
            ),
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
          'surse'
        ) {
          return {
            docs:
              sources,

            totalDocs:
              sources.length,
          }
        }

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

        throw new Error(
          `Unexpected collection ${collection}`,
        )
      },
    )

  return {
    findByID,
    find,
  } as unknown as
    RuntimePayload
}

function sourceRetriever({
  status =
    200,
}: {
  status?:
    number
} = {}) {
  const fetchMock =
    vi.fn(
      async () =>
        new Response(
          status >=
          200 &&
          status <
          300
            ? factualClaimText
            : 'Server error',
          {
            status,

            headers: {
              'content-type':
                'text/plain',
            },
          },
        ),
    )

  return {
    fetchMock,

    options: {
      fetchImpl:
        fetchMock as unknown as
          typeof fetch,

      networkPolicyOptions: {
        resolveHostname:
          async () => [
            {
              address:
                '93.184.216.34',

              family:
                4 as const,
            },
          ],
      },
    },
  }
}

function factualProducers() {
  const claimExecutorMock =
    vi.fn(
      async () =>
        JSON.stringify({
          claims: [
            {
              sourceField:
                'title',

              evidenceText:
                factualClaimText,
            },
          ],
        }),
    )

  const claimExecutor:
    FlashSemanticTextExecutor =
      claimExecutorMock

  const verificationExecutorMock =
    vi.fn(
      async (
        input:
          Parameters<
            FlashSemanticTextExecutor
          >[0],
      ) => {
        const jsonStart =
          input.userPrompt.indexOf(
            '{',
          )

        if (
          jsonStart <
          0
        ) {
          throw new Error(
            'Verification prompt JSON not found',
          )
        }

        const promptInput =
          JSON.parse(
            input.userPrompt.slice(
              jsonStart,
            ),
          ) as {
            claims:
              Array<{
                claimId:
                  string
              }>

            chunks:
              Array<{
                chunkId:
                  string

                chunkIndex:
                  number
              }>
          }

        return JSON.stringify({
          claims:
            promptInput.claims.map(
              claim => ({
                claimId:
                  claim.claimId,

                checks:
                  promptInput.chunks.map(
                    chunk => ({
                      chunkId:
                        chunk.chunkId,

                      chunkIndex:
                        chunk.chunkIndex,

                      verdict:
                        'supports',
                    }),
                  ),
              }),
            ),
        })
      },
    )

  const verificationExecutor:
    FlashSemanticTextExecutor =
      verificationExecutorMock

  return {
    claimExecutorMock,

    verificationExecutorMock,

    factualClaimExtractionProducer:
      createFlashFactualClaimExtractionSemanticProducer({
        executor:
          claimExecutor,

        provider:
          'test-provider',

        model:
          'test-model',
      }),

    factualVerificationProducer:
      createFlashFactualVerificationSemanticProducer({
        executor:
          verificationExecutor,

        provider:
          'test-provider',

        model:
          'test-model',
      }),
  }
}

function semanticProducers() {
  const safetyProducer = {
    descriptor: {
      kind:
        'safety',

      method:
        'deterministic',
    } as const,

    async produce() {
      return {
        findings:
          [],
      }
    },
  }

  const medicalInterpretationProducer = {
    descriptor: {
      kind:
        'medicalInterpretation',

      method:
        'deterministic',
    } as const,

    async produce() {
      return {
        findings:
          [],
      }
    },
  }

  const extraordinaryClaimProducer = {
    descriptor: {
      kind:
        'extraordinaryClaim',

      method:
        'deterministic',
    } as const,

    async produce() {
      return {
        findings:
          [],
      }
    },
  }

  const regulatoryStatusProducer = {
    descriptor: {
      kind:
        'regulatoryStatus',

      method:
        'deterministic',
    } as const,

    async produce() {
      return {
        regulatoryContextRelevant:
          false,

        findings:
          [],
      }
    },
  }

  const contradictionExecutorMock =
    vi.fn(
      async () =>
        '{"cases":[]}',
    )

  const contradictionExecutor:
    FlashSemanticTextExecutor =
      contradictionExecutorMock

  const contradictionProducer =
    createFlashContradictionSemanticProducer({
      executor:
        contradictionExecutor,

      provider:
        'test-provider',

      model:
        'test-model',
    })

  return {
    safetyProducer,
    medicalInterpretationProducer,
    extraordinaryClaimProducer,
    regulatoryStatusProducer,
    contradictionProducer,
    contradictionExecutorMock,
  }
}

describe(
  'Flash Payload produced factual runtime read-only',
  () => {
    it(
      'produces factual support end-to-end with exactly one source HTTP retrieval',
      async () => {
        const sourceRuntime =
          sourceRetriever()

        const factual =
          factualProducers()

        const semantic =
          semanticProducers()

        const result =
          await evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'factual-runtime-run-1',

            factualClaimExtractionProducer:
              factual
                .factualClaimExtractionProducer,

            factualVerificationProducer:
              factual
                .factualVerificationProducer,

            safetyProducer:
              semantic
                .safetyProducer,

            medicalInterpretationProducer:
              semantic
                .medicalInterpretationProducer,

            extraordinaryClaimProducer:
              semantic
                .extraordinaryClaimProducer,

            regulatoryStatusProducer:
              semantic
                .regulatoryStatusProducer,

            contradictionProducer:
              semantic
                .contradictionProducer,

            semanticEvidence:
              {},

            options: {
              sourceRetriever:
                sourceRuntime.options,
            },
          })

        /**
         * Un singur retrieval:
         *
         * - primul produce Source Verification;
         * - factual corpus reutilizează retrievals;
         * - orchestratorul primește precomputed result.
         */
        expect(
          sourceRuntime.fetchMock,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          result
            .factualSourceVerification
            .verificationCoverage,
        ).toBe(
          'complete',
        )

        expect(
          result
            .factualSourceCorpus
            .complete,
        ).toBe(
          true,
        )

        expect(
          result
            .factualEvidenceSetComplete,
        ).toBe(
          true,
        )

        expect(
          result.factualChunks,
        ).toHaveLength(
          1,
        )

        expect(
          factual
            .claimExecutorMock,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          factual
            .verificationExecutorMock,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          result
            .factualClaimExtractionProduction
            ?.ok,
        ).toBe(
          true,
        )

        expect(
          result
            .factualVerificationProduction
            ?.ok,
        ).toBe(
          true,
        )

        if (
          result
            .factualVerificationProduction
            ?.ok !==
          true
        ) {
          throw new Error(
            'Expected factual verification success',
          )
        }

        expect(
          result
            .factualVerificationProduction
            .provenance
            .verifications[0]
            ?.supportStatus,
        ).toBe(
          'supported',
        )

        /**
         * Provenance-ul produs ajunge în pipeline-ul
         * factual existent.
         */
        expect(
          result
            .semanticRuntime
            .runtime
            .factualSupport
            ?.provenance
            .valid,
        ).toBe(
          true,
        )

        expect(
          result
            .semanticRuntime
            .runtime
            .factualSupport
            ?.decisionEvidence
            .factsSupportedBySources,
        ).toBe(
          true,
        )

        /**
         * Orchestratorul reutilizează exact obiectul
         * Source Verification deja calculat.
         */
        expect(
          result
            .semanticRuntime
            .runtime
            .sourceVerification,
        ).toBe(
          result
            .factualSourceVerification,
        )

        /**
         * Nu există perechi support-vs-contradict,
         * deci Contradictions este complet, dar gol.
         * Modelul de contradicții nu este consumat.
         */
        expect(
          result
            .semanticRuntime
            .contradictionProduction
            ?.ok,
        ).toBe(
          true,
        )

        expect(
          semantic
            .contradictionExecutorMock,
        ).not.toHaveBeenCalled()

        expect(
          result
            .semanticRuntime
            .runtime
            .runtimeDecision
            .decision,
        ).toEqual({
          decision:
            'autoPublish',

          reasons: [
            'auto_publish_gates_passed',
          ],
        })
      },
    )

    it(
      'fails closed and skips factual models when source evidence is unusable',
      async () => {
        const sourceRuntime =
          sourceRetriever({
            status:
              500,
          })

        const factual =
          factualProducers()

        const semantic =
          semanticProducers()

        const result =
          await evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly({
            payload:
              payloadReader(),

            flashId:
              1,

            runId:
              'factual-runtime-run-2',

            factualClaimExtractionProducer:
              factual
                .factualClaimExtractionProducer,

            factualVerificationProducer:
              factual
                .factualVerificationProducer,

            safetyProducer:
              semantic
                .safetyProducer,

            medicalInterpretationProducer:
              semantic
                .medicalInterpretationProducer,

            extraordinaryClaimProducer:
              semantic
                .extraordinaryClaimProducer,

            regulatoryStatusProducer:
              semantic
                .regulatoryStatusProducer,

            contradictionProducer:
              semantic
                .contradictionProducer,

            semanticEvidence:
              {},

            options: {
              sourceRetriever:
                sourceRuntime.options,
            },
          })

        expect(
          sourceRuntime.fetchMock,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          result
            .factualSourceVerification
            .verificationCoverage,
        ).toBe(
          'complete',
        )

        expect(
          result
            .factualSourceCorpus
            .complete,
        ).toBe(
          false,
        )

        expect(
          result
            .factualEvidenceSetComplete,
        ).toBe(
          false,
        )

        /**
         * Evidence factual incomplet:
         * nu consumăm modelele.
         */
        expect(
          factual
            .claimExecutorMock,
        ).not.toHaveBeenCalled()

        expect(
          factual
            .verificationExecutorMock,
        ).not.toHaveBeenCalled()

        expect(
          result
            .factualClaimExtractionProduction,
        ).toBeNull()

        expect(
          result
            .factualVerificationProduction,
        ).toBeNull()

        /**
         * Nicio concluzie factuală implicită.
         */
        expect(
          result
            .semanticRuntime
            .runtime
            .factualSupport,
        ).toBeNull()

        expect(
          result
            .semanticRuntime
            .contradictionProduction,
        ).toBeNull()

        expect(
          result
            .semanticRuntime
            .runtime
            .runtimeDecision
            .decision
            .decision,
        ).toBe(
          'review',
        )

        expect(
          result
            .semanticRuntime
            .runtime
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toContain(
          'factualSupport',
        )
      },
    )
  },
)
