import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

import {
  buildFlashFactualClaimCandidates,
} from '@/lib/flash/semanticEvidence/factualClaimExtractionAdapter'

import {
  parseFlashFactualClaimExtractionSemanticOutput,
} from '@/lib/flash/semanticEvidence/factualClaimExtractionSemanticOutput'

function document(
  overrides:
    Partial<
      FlashSemanticDocument
    > = {},
):
  FlashSemanticDocument {
  return {
    flashId:
      10,

    language:
      'ro',

    title:
      'FDA a autorizat noul dispozitiv.',

    excerpt:
      'Compania a anunțat rezultatele studiului.',

    bodyText:
      [
        'Studiul a inclus 500 de participanți.',
        '',
        'Rezultatul principal a fost pozitiv.',
      ].join(
        '\n',
      ),

    metadata: {
      flashType:
        'research',

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
    },

    ...overrides,
  } as FlashSemanticDocument
}

describe(
  'Flash factual claim extraction semantic output',
  () => {
    it(
      'parses strict raw JSON without accepting model-owned identities',
      () => {
        const result =
          parseFlashFactualClaimExtractionSemanticOutput(
            JSON.stringify({
              claims: [
                {
                  sourceField:
                    'title',

                  evidenceText:
                    'FDA a autorizat noul dispozitiv.',
                },
                {
                  sourceField:
                    'body',

                  evidenceText:
                    'Studiul a inclus 500 de participanți.',
                },
              ],
            }),
          )

        expect(
          result,
        ).toEqual({
          claims: [
            {
              sourceField:
                'title',

              evidenceText:
                'FDA a autorizat noul dispozitiv.',
            },
            {
              sourceField:
                'body',

              evidenceText:
                'Studiul a inclus 500 de participanți.',
            },
          ],
        })
      },
    )

    it(
      'allows an empty claim set',
      () => {
        expect(
          parseFlashFactualClaimExtractionSemanticOutput(
            '{"claims":[]}',
          ),
        ).toEqual({
          claims:
            [],
        })
      },
    )

    it(
      'rejects code fences and malformed JSON',
      () => {
        expect(
          () =>
            parseFlashFactualClaimExtractionSemanticOutput(
              '```json\n{"claims":[]}\n```',
            ),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'rejects additional root or claim fields',
      () => {
        expect(
          () =>
            parseFlashFactualClaimExtractionSemanticOutput(
              JSON.stringify({
                claims:
                  [],

                decision:
                  'autoPublish',
              }),
            ),
        ).toThrow(
          'invalid_output',
        )

        expect(
          () =>
            parseFlashFactualClaimExtractionSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    sourceField:
                      'body',

                    evidenceText:
                      'Text.',

                    claimId:
                      'model-owned-id',
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'rejects invalid fields, blank evidence and duplicate claims',
      () => {
        expect(
          () =>
            parseFlashFactualClaimExtractionSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    sourceField:
                      'metadata',

                    evidenceText:
                      'Text.',
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output',
        )

        expect(
          () =>
            parseFlashFactualClaimExtractionSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    sourceField:
                      'body',

                    evidenceText:
                      '   ',
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output',
        )

        expect(
          () =>
            parseFlashFactualClaimExtractionSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    sourceField:
                      'body',

                    evidenceText:
                      'Același claim.',
                  },
                  {
                    sourceField:
                      'body',

                    evidenceText:
                      'Același claim.',
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'anchors claims exactly and creates deterministic code-owned claim IDs',
      () => {
        const output =
          parseFlashFactualClaimExtractionSemanticOutput(
            JSON.stringify({
              claims: [
                {
                  sourceField:
                    'title',

                  evidenceText:
                    'FDA a autorizat noul dispozitiv.',
                },
                {
                  sourceField:
                    'excerpt',

                  evidenceText:
                    'a anunțat rezultatele',
                },
                {
                  sourceField:
                    'body',

                  evidenceText:
                    'Rezultatul principal a fost pozitiv.',
                },
              ],
            }),
          )

        const first =
          buildFlashFactualClaimCandidates({
            document:
              document(),

            output,
          })

        const second =
          buildFlashFactualClaimCandidates({
            document:
              document(),

            output,
          })

        expect(
          first,
        ).toEqual(
          second,
        )

        expect(
          first.claims,
        ).toHaveLength(
          3,
        )

        expect(
          first.claims[0],
        ).toMatchObject({
          text:
            'FDA a autorizat noul dispozitiv.',

          sourceField:
            'title',

          sourceOffset:
            0,
        })

        expect(
          first.claims[0]
            ?.id,
        ).toMatch(
          /^claim:[a-f0-9]{64}$/,
        )

        expect(
          first.claimCandidates,
        ).toEqual(
          first.claims.map(
            claim => ({
              id:
                claim.id,

              text:
                claim.text,
            }),
          ),
        )
      },
    )

    it(
      'rejects evidence that is absent from the declared field',
      () => {
        expect(
          () =>
            buildFlashFactualClaimCandidates({
              document:
                document(),

              output: {
                claims: [
                  {
                    sourceField:
                      'title',

                    evidenceText:
                      'Studiul a inclus 500 de participanți.',
                  },
                ],
              },
            }),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'rejects excerpt evidence when the document has no excerpt',
      () => {
        expect(
          () =>
            buildFlashFactualClaimCandidates({
              document:
                document({
                  excerpt:
                    null,
                }),

              output: {
                claims: [
                  {
                    sourceField:
                      'excerpt',

                    evidenceText:
                      'Fragment.',
                  },
                ],
              },
            }),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'creates distinct identities for identical text anchored in different fields',
      () => {
        const sameText =
          'Același fapt.'

        const result =
          buildFlashFactualClaimCandidates({
            document:
              document({
                title:
                  sameText,

                excerpt:
                  sameText,
              }),

            output: {
              claims: [
                {
                  sourceField:
                    'title',

                  evidenceText:
                    sameText,
                },
                {
                  sourceField:
                    'excerpt',

                  evidenceText:
                    sameText,
                },
              ],
            },
          })

        expect(
          result.claims[0]
            ?.id,
        ).not.toBe(
          result.claims[1]
            ?.id,
        )
      },
    )

    it(
      'changes claim identity when the anchored factual text changes',
      () => {
        const first =
          buildFlashFactualClaimCandidates({
            document:
              document({
                bodyText:
                  'Au fost incluși 500 de participanți.',
              }),

            output: {
              claims: [
                {
                  sourceField:
                    'body',

                  evidenceText:
                    'Au fost incluși 500 de participanți.',
                },
              ],
            },
          })

        const second =
          buildFlashFactualClaimCandidates({
            document:
              document({
                bodyText:
                  'Au fost incluși 600 de participanți.',
              }),

            output: {
              claims: [
                {
                  sourceField:
                    'body',

                  evidenceText:
                    'Au fost incluși 600 de participanți.',
                },
              ],
            },
          })

        expect(
          first.claims[0]
            ?.id,
        ).not.toBe(
          second.claims[0]
            ?.id,
        )
      },
    )
  },
)
