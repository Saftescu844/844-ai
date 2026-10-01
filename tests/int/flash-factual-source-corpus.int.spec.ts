import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashPayloadSourceVerificationRuntimeResult,
} from '@/lib/flash/runtimeEvidence/payloadSourceVerificationRuntime'

import {
  buildFlashFactualSourceCorpus,
} from '@/lib/flash/semanticEvidence/factualSourceCorpus'

function runtimeResult({
  coverage =
    'complete',
  planItems =
    [],
  retrievals =
    [],
}: {
  coverage?:
    'notRun' | 'partial' | 'complete'

  planItems?:
    unknown[]

  retrievals?:
    unknown[]
} = {}):
  FlashPayloadSourceVerificationRuntimeResult {
  return {
    plan: {
      flashId:
        10,

      totalRows:
        planItems.length,

      retrieveCount:
        planItems.filter(
          item =>
            (
              item as {
                action?: string
              }
            ).action ===
              'retrieve',
        ).length,

      skipCount:
        planItems.filter(
          item =>
            (
              item as {
                action?: string
              }
            ).action ===
              'skip',
        ).length,

      items:
        planItems,
    },

    verificationCoverage:
      coverage,

    verification:
      coverage ===
        'notRun'
        ? null
        : {
            retrievals,

            sourceVerification: {
              sourceVerificationPassed:
                true,

              evaluatedSources:
                [],
            },

            decisionEvidence: {
              sourceVerificationPassed:
                true,
            },
          },

    completeDecisionEvidence:
      null,
  } as unknown as
    FlashPayloadSourceVerificationRuntimeResult
}

function retrieveItem({
  id,
  rowIndex,
  rowId,
}: {
  id:
    string

  rowIndex:
    number

  rowId:
    string | null
}) {
  return {
    rowIndex,
    rowId,
    sourceId:
      100 + rowIndex,

    action:
      'retrieve',

    skipReason:
      null,

    retrievalInput: {
      id,

      registeredSourceUrl:
        'https://example.com',

      concreteUrl:
        `https://example.com/article-${rowIndex}`,
    },
  }
}

function successfulRetrieval({
  id,
  text =
    'Source factual text.',
}: {
  id:
    string

  text?:
    string | null
}) {
  return {
    candidate: {
      id,

      registeredSourceUrl:
        'https://example.com',

      concreteUrl:
        'https://example.com/article',

      finalUrl:
        'https://example.com/article',

      retrieved:
        true,

      contentAvailable:
        true,
    },

    statusCode:
      200,

    contentType:
      'text/html',

    bytesRead:
      100,

    textContent:
      text,

    failureReason:
      null,

    networkPolicyReason:
      null,
  }
}

describe(
  'Flash factual source corpus',
  () => {
    it(
      'reuses candidate.id as citationId and preserves deterministic plan metadata',
      () => {
        const result =
          buildFlashFactualSourceCorpus(
            runtimeResult({
              planItems: [
                retrieveItem({
                  id:
                    'row-1',

                  rowIndex:
                    0,

                  rowId:
                    'row-1',
                }),
                retrieveItem({
                  id:
                    '10:1',

                  rowIndex:
                    1,

                  rowId:
                    null,
                }),
              ],

              retrievals: [
                successfulRetrieval({
                  id:
                    'row-1',

                  text:
                    ' Prima sursă. ',
                }),
                successfulRetrieval({
                  id:
                    '10:1',

                  text:
                    'A doua sursă.',
                }),
              ],
            }),
          )

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.issues,
        ).toEqual([])

        expect(
          result.documents,
        ).toEqual([
          expect.objectContaining({
            citationId:
              'row-1',

            rowIndex:
              0,

            rowId:
              'row-1',

            sourceId:
              100,

            textContent:
              'Prima sursă.',
          }),
          expect.objectContaining({
            citationId:
              '10:1',

            rowIndex:
              1,

            rowId:
              null,

            sourceId:
              101,

            textContent:
              'A doua sursă.',
          }),
        ])
      },
    )

    it(
      'preserves usable retrieved documents but marks partial source coverage incomplete',
      () => {
        const retrieve =
          retrieveItem({
            id:
              'row-1',

            rowIndex:
              0,

            rowId:
              'row-1',
          })

        const skipped = {
          rowIndex:
            1,

          rowId:
            'row-2',

          sourceId:
            102,

          action:
            'skip',

          skipReason:
            'ingestion_disabled',

          retrievalInput:
            null,
        }

        const result =
          buildFlashFactualSourceCorpus(
            runtimeResult({
              coverage:
                'partial',

              planItems: [
                retrieve,
                skipped,
              ],

              retrievals: [
                successfulRetrieval({
                  id:
                    'row-1',
                }),
              ],
            }),
          )

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.documents,
        ).toHaveLength(
          1,
        )

        expect(
          result.issues,
        ).toContainEqual({
          citationId:
            null,

          reason:
            'source_verification_incomplete',
        })
      },
    )

    it(
      'does not expose a failed retrieval as factual source text',
      () => {
        const result =
          buildFlashFactualSourceCorpus(
            runtimeResult({
              planItems: [
                retrieveItem({
                  id:
                    'row-1',

                  rowIndex:
                    0,

                  rowId:
                    'row-1',
                }),
              ],

              retrievals: [
                {
                  ...successfulRetrieval({
                    id:
                      'row-1',
                  }),

                  candidate: {
                    ...successfulRetrieval({
                      id:
                        'row-1',
                    }).candidate,

                    retrieved:
                      false,

                    contentAvailable:
                      false,
                  },

                  textContent:
                    null,

                  failureReason:
                    'network_error',
                },
              ],
            }),
          )

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.documents,
        ).toEqual([])

        expect(
          result.issues,
        ).toContainEqual({
          citationId:
            'row-1',

          reason:
            'retrieval_failed',
        })
      },
    )

    it(
      'marks binary or otherwise non-text content unavailable for factual verification',
      () => {
        const result =
          buildFlashFactualSourceCorpus(
            runtimeResult({
              planItems: [
                retrieveItem({
                  id:
                    'row-1',

                  rowIndex:
                    0,

                  rowId:
                    'row-1',
                }),
              ],

              retrievals: [
                successfulRetrieval({
                  id:
                    'row-1',

                  text:
                    null,
                }),
              ],
            }),
          )

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.documents,
        ).toEqual([])

        expect(
          result.issues,
        ).toContainEqual({
          citationId:
            'row-1',

          reason:
            'text_content_unavailable',
        })
      },
    )

    it(
      'detects a planned citation with no retrieval result',
      () => {
        const result =
          buildFlashFactualSourceCorpus(
            runtimeResult({
              planItems: [
                retrieveItem({
                  id:
                    'row-1',

                  rowIndex:
                    0,

                  rowId:
                    'row-1',
                }),
              ],

              retrievals:
                [],
            }),
          )

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.issues,
        ).toContainEqual({
          citationId:
            'row-1',

          reason:
            'missing_retrieval_result',
        })
      },
    )

    it(
      'detects retrieval output that is not present in the deterministic plan',
      () => {
        const result =
          buildFlashFactualSourceCorpus(
            runtimeResult({
              planItems: [
                retrieveItem({
                  id:
                    'row-1',

                  rowIndex:
                    0,

                  rowId:
                    'row-1',
                }),
              ],

              retrievals: [
                successfulRetrieval({
                  id:
                    'invented-row',
                }),
              ],
            }),
          )

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.documents,
        ).toEqual([])

        expect(
          result.issues,
        ).toContainEqual({
          citationId:
            'invented-row',

          reason:
            'unexpected_retrieval_result',
        })

        expect(
          result.issues,
        ).toContainEqual({
          citationId:
            'row-1',

          reason:
            'missing_retrieval_result',
        })
      },
    )
  },
)
