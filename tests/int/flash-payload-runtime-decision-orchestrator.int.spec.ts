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
  evaluateFlashRuntimeByIdReadOnly,
  type FlashRuntimeSemanticEvidenceInput,
} from '@/lib/flash/runtimeEvidence/payloadRuntimeDecisionOrchestrator'

type OrchestratorPayload =
  Parameters<
    typeof evaluateFlashRuntimeByIdReadOnly
  >[0]

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id: 1,
    titlu:
      'Flash runtime test',
    slug:
      'flash-runtime-test',
    limba:
      'ro',
    versiuneAlternativa:
      2,
    pilon:
      1,
    flashType:
      'announcement',
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
      'event-runtime-test',
    sourceFingerprint:
      'source-runtime-test',
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
      id: 2,
      limba: 'en',
      versiuneAlternativa: 1,
      slug:
        'flash-runtime-test-en',
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
} = {}): OrchestratorPayload {
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
          /**
           * Pentru dedup returnăm doar candidatul.
           * Evaluatorul îl ignoră pe sine, deci nu
           * există match fals.
           */
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
  } as unknown as OrchestratorPayload
}

function safeSemanticEvidence():
  FlashRuntimeSemanticEvidenceInput {
  return {
    factualSupport: {
      claims: [
        {
          id:
            'claim-1',
          text:
            'A supported factual claim.',
          citationIds: [
            'citation-1',
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
                'citation-1',
              verdict:
                'supports',
              evidenceRef:
                'source:paragraph-1',
            },
          ],
        },
      ],
    },

    contradictions: {
      cases: [],
    },

    safety: {
      findings: [],
    },

    medicalInterpretation: {
      findings: [],
    },

    extraordinaryClaim: {
      findings: [],
    },

    regulatoryStatus: {
      regulatoryContextRelevant:
        false,
      findings: [],
    },
  }
}

function successfulSourceOptions() {
  return {
    fetchImpl:
      vi.fn(
        async () =>
          new Response(
            'Verified source content.',
            {
              status: 200,
              headers: {
                'content-type':
                  'text/html',
              },
            },
          ),
      ) as typeof fetch,

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
  }
}

describe(
  'Flash Payload runtime decision orchestrator',
  () => {
    it(
      'complete safe runtime evidence reaches AUTO',
      async () => {
        const result =
          await evaluateFlashRuntimeByIdReadOnly(
            payloadReader(),
            1,
            safeSemanticEvidence(),
            {
              sourceRetriever:
                successfulSourceOptions(),
            },
          )

        expect(
          result
            .sourceVerification
            .verificationCoverage,
        ).toBe('complete')

        expect(
          result
            .runtimeDecision
            .aggregatedEvidence
            .complete,
        ).toBe(true)

        expect(
          result
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
      'missing semantic component produces engine uncertainty',
      async () => {
        const semantic =
          safeSemanticEvidence()

        semantic.safety =
          null

        const result =
          await evaluateFlashRuntimeByIdReadOnly(
            payloadReader(),
            1,
            semantic,
            {
              sourceRetriever:
                successfulSourceOptions(),
            },
          )

        expect(
          result
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toEqual([
          'safety',
        ])

        expect(
          result
            .runtimeDecision
            .decision,
        ).toEqual({
          decision:
            'review',
          reasons: [
            'engine_uncertain',
          ],
        })
      },
    )

    it(
      'source notRun remains incomplete and does not fabricate source verification',
      async () => {
        const result =
          await evaluateFlashRuntimeByIdReadOnly(
            payloadReader({
              sources: [
                source({
                  allowIngestion:
                    false,
                }),
              ],
            }),
            1,
            safeSemanticEvidence(),
            {
              sourceRetriever:
                successfulSourceOptions(),
            },
          )

        expect(
          result
            .sourceVerification
            .verificationCoverage,
        ).toBe('notRun')

        expect(
          result
            .sourceVerification
            .completeDecisionEvidence,
        ).toBeNull()

        expect(
          result
            .runtimeDecision
            .aggregatedEvidence
            .missingComponents,
        ).toContain(
          'sourceVerification',
        )

        expect(
          result
            .runtimeDecision
            .decision,
        ).toEqual({
          decision:
            'review',
          reasons: [
            'sources_not_validated',
            'source_auto_publish_disabled',
            'engine_uncertain',
          ],
        })
      },
    )

    it(
      'completed retrieval failure is known REVIEW rather than engine uncertainty',
      async () => {
        const result =
          await evaluateFlashRuntimeByIdReadOnly(
            payloadReader(),
            1,
            safeSemanticEvidence(),
            {
              sourceRetriever: {
                ...successfulSourceOptions(),

                fetchImpl:
                  vi.fn(
                    async () =>
                      new Response(
                        'Server error',
                        {
                          status:
                            500,
                        },
                      ),
                  ) as typeof fetch,
              },
            },
          )

        expect(
          result
            .sourceVerification
            .verificationCoverage,
        ).toBe('complete')

        expect(
          result
            .sourceVerification
            .completeDecisionEvidence,
        ).toEqual({
          sourceVerificationPassed:
            false,
        })

        expect(
          result
            .runtimeDecision
            .aggregatedEvidence
            .complete,
        ).toBe(true)

        expect(
          result
            .runtimeDecision
            .decision,
        ).toEqual({
          decision:
            'review',
          reasons: [
            'sources_not_validated',
          ],
        })
      },
    )

    it(
      'invalid factual provenance stays known REVIEW without engine uncertainty',
      async () => {
        const semantic =
          safeSemanticEvidence()

        semantic.factualSupport = {
          claims: [],
          verifications: [],
        }

        const result =
          await evaluateFlashRuntimeByIdReadOnly(
            payloadReader(),
            1,
            semantic,
            {
              sourceRetriever:
                successfulSourceOptions(),
            },
          )

        expect(
          result
            .factualSupport
            ?.provenance
            .valid,
        ).toBe(false)

        expect(
          result
            .runtimeDecision
            .aggregatedEvidence
            .complete,
        ).toBe(true)

        expect(
          result
            .runtimeDecision
            .decision,
        ).toEqual({
          decision:
            'review',
          reasons: [
            'facts_not_supported',
          ],
        })
      },
    )

    it(
      'confirmed dangerous instructions preserve BLOCK priority',
      async () => {
        const semantic =
          safeSemanticEvidence()

        semantic.safety = {
          findings: [
            {
              id:
                'safety-1',
              type:
                'dangerousInstructions',
              verdict:
                'present',
              evidenceRef:
                'paragraph:3',
            },
          ],
        }

        const result =
          await evaluateFlashRuntimeByIdReadOnly(
            payloadReader(),
            1,
            semantic,
            {
              sourceRetriever:
                successfulSourceOptions(),
            },
          )

        expect(
          result
            .runtimeDecision
            .decision,
        ).toEqual({
          decision:
            'blocked',
          reasons: [
            'dangerous_instructions',
          ],
        })
      },
    )
  },
)
