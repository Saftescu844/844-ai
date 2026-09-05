import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashRegulatoryStatusDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/regulatoryStatusDecisionAdapter'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  parseFlashRegulatoryStatusSemanticOutput,
  toFlashRegulatoryStatusEvidenceInput,
} from '@/lib/flash/semanticEvidence/regulatoryStatusSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
} from '@/lib/flash/semanticEvidence/semanticEvidenceProducer'

function document():
  FlashSemanticDocument {
  return {
    flashId:
      1,

    language:
      'ro',

    title:
      'Compania anunță lansarea unui nou sistem medical',

    excerpt:
      'Produsul este evaluat pentru utilizare clinică.',

    bodyText:
      [
        'Compania a prezentat noi rezultate clinice.',
        '',
        'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
      ].join('\n'),

    metadata: {
      flashType:
        'product',

      informationStatus:
        'confirmed',

      riskLevel:
        'low',

      isHealthRelated:
        true,

      medicalEvidenceType:
        'productOrCompanyClaim',

      clinicalValidationStatus:
        'authorizedOrApproved',
    },
  }
}

function expectInvalidOutput(
  raw:
    string,
) {
  try {
    parseFlashRegulatoryStatusSemanticOutput(
      raw,
    )
  } catch (error) {
    expect(
      error,
    ).toBeInstanceOf(
      FlashSemanticEvidenceProducerError,
    )

    expect(
      (
        error as
          FlashSemanticEvidenceProducerError
      ).reason,
    ).toBe(
      'invalid_output',
    )

    return
  }

  throw new Error(
    'Expected invalid_output',
  )
}

describe(
  'Flash regulatory status semantic output',
  () => {
    it(
      'parses irrelevant regulatory context with no findings',
      () => {
        const result =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                false,

              findings:
                [],
            }),
          )

        expect(
          result,
        ).toEqual({
          regulatoryContextRelevant:
            false,

          findings:
            [],
        })
      },
    )

    it(
      'parses a clear regulatory finding',
      () => {
        const result =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
                },
              ],
            }),
          )

        expect(
          result.findings[0],
        ).toEqual({
          id:
            'regulatory-approval-us',

          type:
            'approvalOrAuthorization',

          verdict:
            'clear',

          evidenceText:
            'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
        })
      },
    )

    it(
      'rejects fenced non-JSON output',
      () => {
        expectInvalidOutput(
          [
            '```json',
            '{"regulatoryContextRelevant":false,"findings":[]}',
            '```',
          ].join('\n'),
        )
      },
    )

    it(
      'rejects unexpected root fields',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            regulatoryContextRelevant:
              false,

            findings:
              [],

            decision:
              'review',
          }),
        )
      },
    )

    it(
      'requires regulatoryContextRelevant to be boolean',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            regulatoryContextRelevant:
              'yes',

            findings:
              [],
          }),
        )
      },
    )

    it(
      'rejects unknown regulatory finding types',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            regulatoryContextRelevant:
              true,

            findings: [
              {
                id:
                  'regulatory-1',

                type:
                  'regulatorMention',

                verdict:
                  'clear',

                evidenceText:
                  null,
              },
            ],
          }),
        )
      },
    )

    it(
      'rejects unknown regulatory verdicts',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            regulatoryContextRelevant:
              true,

            findings: [
              {
                id:
                  'regulatory-1',

                type:
                  'approvalOrAuthorization',

                verdict:
                  'approved',

                evidenceText:
                  null,
              },
            ],
          }),
        )
      },
    )

    it(
      'rejects duplicate finding ids',
      () => {
        expectInvalidOutput(
          JSON.stringify({
            regulatoryContextRelevant:
              true,

            findings: [
              {
                id:
                  'same-id',

                type:
                  'approvalOrAuthorization',

                verdict:
                  'clear',

                evidenceText:
                  null,
              },
              {
                id:
                  'same-id',

                type:
                  'jurisdictionApplicability',

                verdict:
                  'unclear',

                evidenceText:
                  null,
              },
            ],
          }),
        )
      },
    )

    it(
      'allows multiple findings of the same type when their ids differ',
      () => {
        const result =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    null,
                },
                {
                  id:
                    'approval-eu',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'unclear',

                  evidenceText:
                    null,
                },
              ],
            }),
          )

        expect(
          result.findings,
        ).toHaveLength(
          2,
        )
      },
    )

    it(
      'anchors a clear regulatory statement and preserves clear supported status',
      () => {
        const output =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a autorizat sistemul pentru utilizarea X în Statele Unite.',
                },
              ],
            }),
          )

        const adapted =
          toFlashRegulatoryStatusEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          adapted
            .findings[0]
            .evidenceRef,
        ).toMatch(
          /^body:\d+-\d+$/,
        )

        const result =
          buildFlashRegulatoryStatusDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            false,
        })

        expect(
          result
            .regulatoryStatusEvidence
            .evaluatedFindings[0],
        ).toMatchObject({
          evidencePresent:
            true,

          clearAndSupported:
            true,

          reviewRequired:
            false,
        })
      },
    )

    it(
      'turns a clear finding with invented evidence into conservative REVIEW',
      () => {
        const output =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-approval-us',

                  type:
                    'approvalOrAuthorization',

                  verdict:
                    'clear',

                  evidenceText:
                    'FDA a aprobat produsul fără nicio limitare.',
                },
              ],
            }),
          )

        const adapted =
          toFlashRegulatoryStatusEvidenceInput({
            document:
              document(),

            output,
          })

        expect(
          adapted
            .findings[0]
            .evidenceRef,
        ).toBeNull()

        const result =
          buildFlashRegulatoryStatusDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          result
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'clear_regulatory_status_without_evidence',
        )
      },
    )

    it(
      'keeps relevant context without findings at REVIEW',
      () => {
        const output =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings:
                [],
            }),
          )

        const adapted =
          toFlashRegulatoryStatusEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashRegulatoryStatusDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          result
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'regulatory_context_without_status_evidence',
        )
      },
    )

    it(
      'preserves an unclear finding as REVIEW',
      () => {
        const output =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-jurisdiction',

                  type:
                    'jurisdictionApplicability',

                  verdict:
                    'unclear',

                  evidenceText:
                    null,
                },
              ],
            }),
          )

        const adapted =
          toFlashRegulatoryStatusEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashRegulatoryStatusDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          result
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'regulatory_status_unclear',
        )
      },
    )

    it(
      'preserves conflicting regulatory status as REVIEW',
      () => {
        const output =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                true,

              findings: [
                {
                  id:
                    'regulatory-conflict',

                  type:
                    'marketAvailability',

                  verdict:
                    'conflicting',

                  evidenceText:
                    null,
                },
              ],
            }),
          )

        const adapted =
          toFlashRegulatoryStatusEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashRegulatoryStatusDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            true,
        })

        expect(
          result
            .regulatoryStatusEvidence
            .reasons,
        ).toContain(
          'regulatory_status_conflicting',
        )
      },
    )

    it(
      'does not infer regulatory relevance from medical metadata or wording',
      () => {
        const output =
          parseFlashRegulatoryStatusSemanticOutput(
            JSON.stringify({
              regulatoryContextRelevant:
                false,

              findings:
                [],
            }),
          )

        const adapted =
          toFlashRegulatoryStatusEvidenceInput({
            document:
              document(),

            output,
          })

        const result =
          buildFlashRegulatoryStatusDecisionEvidence(
            adapted,
          )

        expect(
          result
            .decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            false,
        })

        expect(
          result
            .regulatoryStatusEvidence
            .reasons,
        ).toEqual(
          [],
        )
      },
    )
  },
)
