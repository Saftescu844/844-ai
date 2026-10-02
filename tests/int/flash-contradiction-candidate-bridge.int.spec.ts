import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashFactualProvenanceInput,
} from '@/lib/flash/runtimeEvidence/factualSupportProvenance'

import {
  buildFlashContradictionSemanticCandidatesFromFactualProvenance,
  type FlashContradictionEvidenceTextResolver,
} from '@/lib/flash/semanticEvidence/contradictionCandidateBridge'

function validInput():
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

function resolverFor(
  entries:
    Record<string, string | null>,
): {
  resolver:
    FlashContradictionEvidenceTextResolver

  mock:
    ReturnType<typeof vi.fn>
} {
  const mock =
    vi.fn(
      async ({
        citationId,
      }: {
        citationId:
          string | number
      }) =>
        entries[
          String(
            citationId,
          )
        ] ??
        null,
    )

  return {
    resolver:
      mock,

    mock,
  }
}

describe(
  'Flash contradiction candidate bridge',
  () => {
    it(
      'builds an anchored candidate from supporting and contradicting evidence for the same claim',
      async () => {
        const {
          resolver,
        } =
          resolverFor({
            100:
              'Studiul raportează o reducere semnificativă a mortalității.',

            200:
              'Analiza nu a identificat o reducere a mortalității.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input:
              validInput(),

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.provenance.valid,
        ).toBe(true)

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.reasons,
        ).toEqual([])

        expect(
          result.unresolvedPositions,
        ).toEqual([])

        expect(
          result.candidates,
        ).toEqual([
          {
            id:
              'contradiction:claim-1:100:200',

            subjectId:
              'claim-1',

            subjectText:
              'Tratamentul reduce mortalitatea.',

            firstPosition: {
              citationId:
                100,

              evidenceRef:
                'source-100:paragraph-4',

              evidenceText:
                'Studiul raportează o reducere semnificativă a mortalității.',
            },

            secondPosition: {
              citationId:
                200,

              evidenceRef:
                'source-200:paragraph-7',

              evidenceText:
                'Analiza nu a identificat o reducere a mortalității.',
            },
          },
        ])
      },
    )

    it(
      'treats partiallySupports as a supporting side',
      async () => {
        const input =
          validInput()

        input.verifications[0]
          .citationChecks[0]
          .verdict =
            'partiallySupports'

        const {
          resolver,
        } =
          resolverFor({
            100:
              'Rezultatul sugerează un beneficiu limitat.',

            200:
              'Analiza nu a identificat beneficiul.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input,

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.candidates,
        ).toHaveLength(
          1,
        )
      },
    )

    it(
      'does not create candidates when there is no opposing citation evidence',
      async () => {
        const input =
          validInput()

        input.claims[0]
          .citationIds = [
            100,
          ]

        input.verifications[0] = {
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
        }

        const {
          resolver,
          mock,
        } =
          resolverFor({
            100:
              'Evidence.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input,

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.candidates,
        ).toEqual([])

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'ignores notFound checks when generating comparison pairs',
      async () => {
        const input =
          validInput()

        input.claims[0]
          .citationIds = [
            100,
            300,
          ]

        input.verifications[0] = {
          claimId:
            'claim-1',

          supportStatus:
            'unsupported',

          method:
            'deterministic',

          citationChecks: [
            {
              citationId:
                100,

              verdict:
                'partiallySupports',

              evidenceRef:
                'source-100:paragraph-4',
            },
            {
              citationId:
                300,

              verdict:
                'notFound',

              evidenceRef:
                'source-300:search',
            },
          ],
        }

        const {
          resolver,
          mock,
        } =
          resolverFor({
            100:
              'Evidence.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input,

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.candidates,
        ).toEqual([])

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'marks the bridge incomplete instead of treating unresolved evidence as clean',
      async () => {
        const {
          resolver,
        } =
          resolverFor({
            100:
              'Supporting evidence.',

            200:
              null,
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input:
              validInput(),

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.reasons,
        ).toEqual([
          'unresolved_evidence_text',
        ])

        expect(
          result.candidates,
        ).toEqual([])

        expect(
          result.unresolvedPositions,
        ).toEqual([
          {
            claimId:
              'claim-1',

            citationId:
              200,

            evidenceRef:
              'source-200:paragraph-7',
          },
        ])
      },
    )

    it(
      'converts resolver errors into incomplete evidence rather than fabricating text',
      async () => {
        const resolver:
          FlashContradictionEvidenceTextResolver =
          async ({
            citationId,
          }) => {
            if (
              String(
                citationId,
              ) ===
              '200'
            ) {
              throw new Error(
                'resolver failed',
              )
            }

            return 'Supporting evidence.'
          }

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input:
              validInput(),

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.reasons,
        ).toContain(
          'unresolved_evidence_text',
        )

        expect(
          result.candidates,
        ).toEqual([])
      },
    )

    it(
      'does not invoke the resolver when factual provenance is invalid',
      async () => {
        const input =
          validInput()

        input.claims[0]
          .citationIds = [
            100,
          ]

        const {
          resolver,
          mock,
        } =
          resolverFor({
            100:
              'Evidence.',
            200:
              'Other evidence.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input,

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.provenance.valid,
        ).toBe(false)

        expect(
          result.complete,
        ).toBe(false)

        expect(
          result.reasons,
        ).toEqual([
          'invalid_factual_provenance',
        ])

        expect(
          result.candidates,
        ).toEqual([])

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'builds the support-by-contradiction cross product and resolves each position only once',
      async () => {
        const input =
          validInput()

        input.claims[0]
          .citationIds = [
            100,
            101,
            200,
          ]

        input.verifications[0]
          .citationChecks = [
            {
              citationId:
                100,

              verdict:
                'supports',

              evidenceRef:
                'source-100:p1',
            },
            {
              citationId:
                101,

              verdict:
                'partiallySupports',

              evidenceRef:
                'source-101:p2',
            },
            {
              citationId:
                200,

              verdict:
                'contradicts',

              evidenceRef:
                'source-200:p3',
            },
          ]

        const {
          resolver,
          mock,
        } =
          resolverFor({
            100:
              'Supporting evidence A.',

            101:
              'Supporting evidence B.',

            200:
              'Contradicting evidence.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input,

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.candidates.map(
            item =>
              item.id,
          ),
        ).toEqual([
          'contradiction:claim-1:100:200',
          'contradiction:claim-1:101:200',
        ])

        expect(
          mock,
        ).toHaveBeenCalledTimes(
          3,
        )
      },
    )

    it(
      'never compares a citation against itself',
      async () => {
        const input =
          validInput()

        input.claims[0]
          .citationIds = [
            100,
          ]

        input.verifications[0] = {
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
                'source-100:p1',
            },
            {
              citationId:
                100,

              verdict:
                'contradicts',

              evidenceRef:
                'source-100:p2',
            },
          ],
        }

        const {
          resolver,
          mock,
        } =
          resolverFor({
            100:
              'Evidence.',
          })

        const result =
          await buildFlashContradictionSemanticCandidatesFromFactualProvenance({
            input,

            resolveEvidenceText:
              resolver,
          })

        expect(
          result.complete,
        ).toBe(true)

        expect(
          result.candidates,
        ).toEqual([])

        expect(
          mock,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
