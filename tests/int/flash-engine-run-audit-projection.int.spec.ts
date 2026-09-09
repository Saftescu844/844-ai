import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashEngineRunCompletedAuditProjection,
  type FlashEngineRunAuditProjectionInput,
} from '@/lib/flash/audit/flashEngineRunAuditProjection'

describe(
  'Flash Engine run audit projection',
  () => {
    it(
      'projects only audit-safe decision and evidence metadata',
      () => {
        const sourceDocument = {
          rawText:
            'RAW_SOURCE_DOCUMENT_MUST_NOT_PERSIST',
        }

        const factualChunk = {
          evidenceText:
            'RAW_FACTUAL_CHUNK_MUST_NOT_PERSIST',
        }

        const claimExtractionProduction = {
          ok: true,
          rawProviderResponse:
            'RAW_PROVIDER_RESPONSE_MUST_NOT_PERSIST',
        }

        const input:
          FlashEngineRunAuditProjectionInput = {
            factualEvidenceSetComplete:
              true,

            factualSourceCorpus: {
              complete:
                true,

              documents: [
                sourceDocument,
              ],
            },

            factualChunks: [
              factualChunk,
            ],

            factualClaimExtractionProduction:
              claimExtractionProduction,

            factualVerificationProduction: {
              ok: false,
            },

            semanticRuntime: {
              contradictionProduction:
                null,

              safetyProduction: {
                ok: true,
              },

              medicalInterpretationProduction: {
                ok: true,
              },

              extraordinaryClaimProduction: {
                ok: false,
              },

              regulatoryStatusProduction: {
                ok: true,
              },

              runtime: {
                runtimeDecision: {
                  aggregatedEvidence: {
                    complete:
                      false,

                    missingComponents: [
                      'contradictions',
                    ],
                  },

                  decisionInput: {
                    informationStatus:
                      'official',

                    riskLevel:
                      'low',

                    roComplete:
                      true,

                    enComplete:
                      false,

                    dedupPassed:
                      true,

                    sourcesValid:
                      true,

                    factsSupportedBySources:
                      false,

                    materialContradictions:
                      false,

                    sourceAllowsAutoPublish:
                      true,

                    requiredDisclaimersApplied:
                      true,

                    engineCertain:
                      false,

                    safetyGateTriggered:
                      false,

                    importantMedicalInterpretation:
                      false,

                    extraordinaryClaimNeedsReview:
                      true,

                    regulatoryStatusUnclear:
                      false,

                    obviousDuplicate:
                      false,

                    unverifiableSources:
                      false,

                    fabricatedInformation:
                      false,

                    fabricatedCitations:
                      false,

                    individualDiagnosis:
                      false,

                    individualTreatmentRecommendation:
                      false,

                    medicationChange:
                      false,

                    dangerousInstructions:
                      false,

                    fundamentalEditorialViolation:
                      false,
                  },

                  decision: {
                    decision:
                      'review',

                    reasons: [
                      'missing_en_version',
                      'facts_not_supported',
                      'extraordinary_claim',
                      'engine_uncertain',
                    ],
                  },
                },
              },
            },
          }

        const projection =
          buildFlashEngineRunCompletedAuditProjection(
            input,
          )

        expect(
          projection.decision,
        ).toBe(
          'review',
        )

        expect(
          projection.reasons,
        ).toEqual([
          {
            reason:
              'missing_en_version',
          },
          {
            reason:
              'facts_not_supported',
          },
          {
            reason:
              'extraordinary_claim',
          },
          {
            reason:
              'engine_uncertain',
          },
        ])

        expect(
          projection
            .evidenceSummary,
        ).toEqual({
          factual: {
            evidenceSetComplete:
              true,

            sourceCorpusComplete:
              true,

            sourceDocumentCount:
              1,

            chunkCount:
              1,

            claimExtraction:
              'completed',

            verification:
              'failed',
          },

          semantic: {
            contradictions:
              'notRun',

            safety:
              'completed',

            medicalInterpretation:
              'completed',

            extraordinaryClaim:
              'failed',

            regulatoryStatus:
              'completed',
          },

          runtime: {
            aggregatedEvidenceComplete:
              false,

            engineCertain:
              false,

            missingComponents: [
              'contradictions',
            ],
          },
        })

        expect(
          projection
            .decisionInputSnapshot
            .engineCertain,
        ).toBe(
          false,
        )

        const persistedJson =
          JSON.stringify(
            projection,
          )

        expect(
          persistedJson,
        ).not.toContain(
          'RAW_SOURCE_DOCUMENT_MUST_NOT_PERSIST',
        )

        expect(
          persistedJson,
        ).not.toContain(
          'RAW_FACTUAL_CHUNK_MUST_NOT_PERSIST',
        )

        expect(
          persistedJson,
        ).not.toContain(
          'RAW_PROVIDER_RESPONSE_MUST_NOT_PERSIST',
        )
      },
    )
  },
)
