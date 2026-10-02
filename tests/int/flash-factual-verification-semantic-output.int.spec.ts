import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  validateFlashFactualProvenance,
} from '@/lib/flash/runtimeEvidence/factualSupportProvenance'

import type {
  FlashFactualSourceChunk,
} from '@/lib/flash/semanticEvidence/factualSourceChunks'

import {
  buildFlashFactualVerificationProvenance,
} from '@/lib/flash/semanticEvidence/factualVerificationAssembler'

import {
  parseFlashFactualVerificationSemanticOutput,
  type FlashFactualVerificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/factualVerificationSemanticOutput'

const claims = [
  {
    id:
      'claim-1',

    text:
      'Studiul a inclus 500 de participanți.',
  },
]

function chunks():
  FlashFactualSourceChunk[] {
  return [
    {
      citationId:
        'source-row-1',

      chunkIndex:
        0,

      chunkId:
        'chunk-a',

      evidenceRef:
        'source-row-1:chunk:0:aaaa',

      evidenceText:
        'Studiul a inclus 500 de participanți.',
    },
    {
      citationId:
        'source-row-2',

      chunkIndex:
        0,

      chunkId:
        'chunk-b',

      evidenceRef:
        'source-row-2:chunk:0:bbbb',

      evidenceText:
        'O altă sursă descrie rezultatele.',
    },
  ]
}

function output(
  verdicts: [
    'supports' |
    'partiallySupports' |
    'contradicts' |
    'notFound',
    'supports' |
    'partiallySupports' |
    'contradicts' |
    'notFound',
  ],
):
  FlashFactualVerificationSemanticOutput {
  return {
    claims: [
      {
        claimId:
          'claim-1',

        checks: [
          {
            chunkId:
              'chunk-a',

            chunkIndex:
              0,

            verdict:
              verdicts[0],
          },
          {
            chunkId:
              'chunk-b',

            chunkIndex:
              0,

            verdict:
              verdicts[1],
          },
        ],
      },
    ],
  }
}

function assemble(
  semanticOutput:
    FlashFactualVerificationSemanticOutput,
  sourceChunks:
    FlashFactualSourceChunk[] =
      chunks(),
) {
  return buildFlashFactualVerificationProvenance({
    claims,

    chunks:
      sourceChunks,

    output:
      semanticOutput,

    generationRunId:
      'generation-run-1',

    verificationRunId:
      'verification-run-1',
  })
}

describe(
  'Flash factual verification semantic output',
  () => {
    it(
      'parses the strict model-owned selection contract',
      () => {
        const parsed =
          parseFlashFactualVerificationSemanticOutput(
            JSON.stringify({
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                  ],
                },
              ],
            }),
          )

        expect(
          parsed,
        ).toEqual({
          claims: [
            {
              claimId:
                'claim-1',

              checks: [
                {
                  chunkId:
                    'chunk-a',

                  chunkIndex:
                    0,

                  verdict:
                    'supports',
                },
              ],
            },
          ],
        })
      },
    )

    it(
      'rejects malformed JSON and markdown fences',
      () => {
        expect(
          () =>
            parseFlashFactualVerificationSemanticOutput(
              '```json\n{"claims":[]}\n```',
            ),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'rejects additional model-owned identity fields',
      () => {
        expect(
          () =>
            parseFlashFactualVerificationSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    claimId:
                      'claim-1',

                    checks: [
                      {
                        chunkId:
                          'chunk-a',

                        chunkIndex:
                          0,

                        verdict:
                          'supports',

                        citationId:
                          'model-source',
                      },
                    ],
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
      'rejects invalid verdicts and invalid chunk indexes',
      () => {
        expect(
          () =>
            parseFlashFactualVerificationSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    claimId:
                      'claim-1',

                    checks: [
                      {
                        chunkId:
                          'chunk-a',

                        chunkIndex:
                          -1,

                        verdict:
                          'maybe',
                      },
                    ],
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
      'rejects duplicate claims and duplicate chunk occurrences',
      () => {
        expect(
          () =>
            parseFlashFactualVerificationSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    claimId:
                      'claim-1',

                    checks:
                      [],
                  },
                  {
                    claimId:
                      'claim-1',

                    checks:
                      [],
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output',
        )

        expect(
          () =>
            parseFlashFactualVerificationSemanticOutput(
              JSON.stringify({
                claims: [
                  {
                    claimId:
                      'claim-1',

                    checks: [
                      {
                        chunkId:
                          'chunk-a',

                        chunkIndex:
                          0,

                        verdict:
                          'supports',
                      },
                      {
                        chunkId:
                          'chunk-a',

                        chunkIndex:
                          0,

                        verdict:
                          'notFound',
                      },
                    ],
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
      'derives supported and reconstructs trusted citation anchors',
      () => {
        const provenance =
          assemble(
            output([
              'supports',
              'notFound',
            ]),
          )

        expect(
          provenance.claims[0],
        ).toEqual({
          id:
            'claim-1',

          text:
            'Studiul a inclus 500 de participanți.',

          citationIds: [
            'source-row-1',
            'source-row-2',
          ],
        })

        expect(
          provenance.verifications[0],
        ).toMatchObject({
          claimId:
            'claim-1',

          supportStatus:
            'supported',

          method:
            'separateModelPass',

          generationRunId:
            'generation-run-1',

          verificationRunId:
            'verification-run-1',

          citationChecks: [
            {
              citationId:
                'source-row-1',

              verdict:
                'supports',

              evidenceRef:
                'source-row-1:chunk:0:aaaa',
            },
            {
              citationId:
                'source-row-2',

              verdict:
                'notFound',

              evidenceRef:
                'source-row-2:chunk:0:bbbb',
            },
          ],
        })

        expect(
          validateFlashFactualProvenance(
            provenance,
          ).valid,
        ).toBe(
          true,
        )
      },
    )

    it(
      'derives partial when only partial support exists',
      () => {
        const provenance =
          assemble(
            output([
              'partiallySupports',
              'notFound',
            ]),
          )

        expect(
          provenance
            .verifications[0]
            ?.supportStatus,
        ).toBe(
          'partial',
        )

        expect(
          validateFlashFactualProvenance(
            provenance,
          ).valid,
        ).toBe(
          true,
        )
      },
    )

    it(
      'gives contradiction precedence over supporting evidence',
      () => {
        const provenance =
          assemble(
            output([
              'supports',
              'contradicts',
            ]),
          )

        expect(
          provenance
            .verifications[0]
            ?.supportStatus,
        ).toBe(
          'contradicted',
        )

        expect(
          validateFlashFactualProvenance(
            provenance,
          ).valid,
        ).toBe(
          true,
        )
      },
    )

    it(
      'derives unsupported when every checked chunk is notFound',
      () => {
        const provenance =
          assemble(
            output([
              'notFound',
              'notFound',
            ]),
          )

        expect(
          provenance
            .verifications[0]
            ?.supportStatus,
        ).toBe(
          'unsupported',
        )

        expect(
          validateFlashFactualProvenance(
            provenance,
          ).valid,
        ).toBe(
          true,
        )
      },
    )

    it(
      'derives unverifiable when no trusted chunks exist',
      () => {
        const provenance =
          assemble(
            {
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks:
                    [],
                },
              ],
            },
            [],
          )

        expect(
          provenance
            .verifications[0]
            ?.supportStatus,
        ).toBe(
          'unverifiable',
        )

        expect(
          provenance
            .claims[0]
            ?.citationIds,
        ).toEqual(
          [],
        )

        expect(
          validateFlashFactualProvenance(
            provenance,
          ).valid,
        ).toBe(
          true,
        )
      },
    )

    it(
      'rejects missing, unknown, or incomplete model coverage',
      () => {
        expect(
          () =>
            assemble({
              claims:
                [],
            }),
        ).toThrow(
          'invalid_output',
        )

        expect(
          () =>
            assemble({
              claims: [
                {
                  claimId:
                    'claim-unknown',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                    {
                      chunkId:
                        'chunk-b',

                      chunkIndex:
                        0,

                      verdict:
                        'notFound',
                    },
                  ],
                },
              ],
            }),
        ).toThrow(
          'invalid_output',
        )

        expect(
          () =>
            assemble({
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                  ],
                },
              ],
            }),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'rejects a model-selected chunk occurrence that was not provided',
      () => {
        expect(
          () =>
            assemble({
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'chunk-a',

                      chunkIndex:
                        999,

                      verdict:
                        'supports',
                    },
                    {
                      chunkId:
                        'chunk-b',

                      chunkIndex:
                        0,

                      verdict:
                        'notFound',
                    },
                  ],
                },
              ],
            }),
        ).toThrow(
          'invalid_output',
        )
      },
    )

    it(
      'distinguishes repeated content chunks by chunkIndex',
      () => {
        const repeatedChunks:
          FlashFactualSourceChunk[] = [
            {
              citationId:
                'source-row-1',

              chunkIndex:
                0,

              chunkId:
                'same-content-hash',

              evidenceRef:
                'source-row-1:chunk:0:same',

              evidenceText:
                'Repeated source text.',
            },
            {
              citationId:
                'source-row-1',

              chunkIndex:
                1,

              chunkId:
                'same-content-hash',

              evidenceRef:
                'source-row-1:chunk:1:same',

              evidenceText:
                'Repeated source text.',
            },
          ]

        const provenance =
          assemble(
            {
              claims: [
                {
                  claimId:
                    'claim-1',

                  checks: [
                    {
                      chunkId:
                        'same-content-hash',

                      chunkIndex:
                        0,

                      verdict:
                        'supports',
                    },
                    {
                      chunkId:
                        'same-content-hash',

                      chunkIndex:
                        1,

                      verdict:
                        'notFound',
                    },
                  ],
                },
              ],
            },
            repeatedChunks,
          )

        expect(
          provenance
            .verifications[0]
            ?.citationChecks,
        ).toEqual([
          {
            citationId:
              'source-row-1',

            verdict:
              'supports',

            evidenceRef:
              'source-row-1:chunk:0:same',
          },
          {
            citationId:
              'source-row-1',

            verdict:
              'notFound',

            evidenceRef:
              'source-row-1:chunk:1:same',
          },
        ])
      },
    )

    it(
      'leaves distinct-run enforcement to the existing provenance validator',
      () => {
        const provenance =
          buildFlashFactualVerificationProvenance({
            claims,

            chunks:
              chunks(),

            output:
              output([
                'supports',
                'notFound',
              ]),

            generationRunId:
              'same-run',

            verificationRunId:
              'same-run',
          })

        const result =
          validateFlashFactualProvenance(
            provenance,
          )

        expect(
          result.valid,
        ).toBe(
          false,
        )

        expect(
          result.reasons,
        ).toContain(
          'same_generation_and_verification_run',
        )
      },
    )
  },
)
