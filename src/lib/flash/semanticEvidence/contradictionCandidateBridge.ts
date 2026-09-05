import type {
  FactualCitationID,
} from '../runtimeEvidence/factualSupportEvidence'

import {
  validateFlashFactualProvenance,
  type FlashCitationCheck,
  type FlashFactualProvenanceInput,
  type FlashFactualProvenanceResult,
} from '../runtimeEvidence/factualSupportProvenance'

import type {
  FlashContradictionSemanticCandidate,
  FlashContradictionSemanticPosition,
} from './contradictionSemanticComparison'

export interface FlashContradictionEvidenceTextResolverInput {
  claimId:
    string

  citationId:
    FactualCitationID

  evidenceRef:
    string
}

/**
 * Resolver read-only către fragmentul concret deja
 * identificat de citationId + evidenceRef.
 *
 * Bridge-ul nu face HTTP și nu inventează text.
 */
export type FlashContradictionEvidenceTextResolver =
  (
    input:
      FlashContradictionEvidenceTextResolverInput,
  ) =>
    Promise<string | null>

export type FlashContradictionCandidateBridgeReason =
  | 'invalid_factual_provenance'
  | 'unresolved_evidence_text'

export interface FlashContradictionUnresolvedPosition {
  claimId:
    string

  citationId:
    FactualCitationID

  evidenceRef:
    string
}

export interface FlashContradictionCandidateBridgeResult {
  provenance:
    FlashFactualProvenanceResult

  /**
   * false înseamnă că setul de candidate NU trebuie
   * interpretat drept o analiză completă.
   */
  complete:
    boolean

  reasons:
    FlashContradictionCandidateBridgeReason[]

  candidates:
    FlashContradictionSemanticCandidate[]

  unresolvedPositions:
    FlashContradictionUnresolvedPosition[]
}

function isSupportingCheck(
  check:
    FlashCitationCheck,
): boolean {
  return (
    check.verdict ===
      'supports' ||
    check.verdict ===
      'partiallySupports'
  )
}

function isContradictingCheck(
  check:
    FlashCitationCheck,
): boolean {
  return (
    check.verdict ===
    'contradicts'
  )
}

function positionKey({
  claimId,
  citationId,
  evidenceRef,
}: FlashContradictionEvidenceTextResolverInput):
  string {
  return [
    claimId,
    String(
      citationId,
    ),
    evidenceRef,
  ].join('\u0000')
}

function pairKey(
  claimId:
    string,
  first:
    FlashCitationCheck,
  second:
    FlashCitationCheck,
): string {
  return [
    claimId,
    String(
      first.citationId,
    ),
    first.evidenceRef,
    String(
      second.citationId,
    ),
    second.evidenceRef,
  ].join('\u0000')
}

function candidateID(
  claimId:
    string,
  firstCitationId:
    FactualCitationID,
  secondCitationId:
    FactualCitationID,
): string {
  return [
    'contradiction',
    encodeURIComponent(
      claimId,
    ),
    encodeURIComponent(
      String(
        firstCitationId,
      ),
    ),
    encodeURIComponent(
      String(
        secondCitationId,
      ),
    ),
  ].join(':')
}

function cleanResolvedText(
  value:
    string | null,
): string | null {
  if (
    typeof value !==
    'string'
  ) {
    return null
  }

  return value.trim().length > 0
    ? value
    : null
}

/**
 * Construiește candidate de comparație numai din
 * factual provenance valid.
 *
 * În v1 comparăm, pentru același claim:
 * - supports / partiallySupports
 * contra
 * - contradicts
 *
 * Citation ids și evidence refs provin exclusiv
 * din factual provenance.
 */
export async function buildFlashContradictionSemanticCandidatesFromFactualProvenance({
  input,
  resolveEvidenceText,
}: {
  input:
    FlashFactualProvenanceInput

  resolveEvidenceText:
    FlashContradictionEvidenceTextResolver
}): Promise<
  FlashContradictionCandidateBridgeResult
> {
  const provenance =
    validateFlashFactualProvenance(
      input,
    )

  if (!provenance.valid) {
    return {
      provenance,

      complete:
        false,

      reasons: [
        'invalid_factual_provenance',
      ],

      candidates:
        [],

      unresolvedPositions:
        [],
    }
  }

  const verificationByClaimID =
    new Map(
      input.verifications.map(
        verification => [
          verification.claimId,
          verification,
        ],
      ),
    )

  const textCache =
    new Map<
      string,
      Promise<string | null>
    >()

  async function resolvedPosition({
    claimId,
    check,
  }: {
    claimId:
      string

    check:
      FlashCitationCheck
  }): Promise<
    FlashContradictionSemanticPosition | null
  > {
    const resolverInput = {
      claimId,

      citationId:
        check.citationId,

      evidenceRef:
        check.evidenceRef,
    }

    const key =
      positionKey(
        resolverInput,
      )

    let pending =
      textCache.get(
        key,
      )

    if (!pending) {
      pending =
        Promise
          .resolve()
          .then(
            () =>
              resolveEvidenceText(
                resolverInput,
              ),
          )
          .then(
            cleanResolvedText,
          )
          .catch(
            () =>
              null,
          )

      textCache.set(
        key,
        pending,
      )
    }

    const evidenceText =
      await pending

    if (!evidenceText) {
      return null
    }

    return {
      citationId:
        check.citationId,

      evidenceRef:
        check.evidenceRef,

      evidenceText,
    }
  }

  const candidates:
    FlashContradictionSemanticCandidate[] =
      []

  const unresolved =
    new Map<
      string,
      FlashContradictionUnresolvedPosition
    >()

  const seenPairs =
    new Set<string>()

  for (
    const claim
    of input.claims
  ) {
    const verification =
      verificationByClaimID.get(
        claim.id,
      )

    if (!verification) {
      /**
       * Nu ar trebui să se întâmple după provenance
       * valid, dar nu inventăm candidate.
       */
      continue
    }

    const supportingChecks =
      verification
        .citationChecks
        .filter(
          isSupportingCheck,
        )

    const contradictingChecks =
      verification
        .citationChecks
        .filter(
          isContradictingCheck,
        )

    for (
      const supporting
      of supportingChecks
    ) {
      for (
        const contradicting
        of contradictingChecks
      ) {
        /**
         * Nu comparăm o citare cu ea însăși.
         */
        if (
          String(
            supporting.citationId,
          ) ===
          String(
            contradicting.citationId,
          )
        ) {
          continue
        }

        const currentPairKey =
          pairKey(
            claim.id,
            supporting,
            contradicting,
          )

        if (
          seenPairs.has(
            currentPairKey,
          )
        ) {
          continue
        }

        seenPairs.add(
          currentPairKey,
        )

        const [
          firstPosition,
          secondPosition,
        ] =
          await Promise.all([
            resolvedPosition({
              claimId:
                claim.id,

              check:
                supporting,
            }),

            resolvedPosition({
              claimId:
                claim.id,

              check:
                contradicting,
            }),
          ])

        if (!firstPosition) {
          const unresolvedPosition = {
            claimId:
              claim.id,

            citationId:
              supporting.citationId,

            evidenceRef:
              supporting.evidenceRef,
          }

          unresolved.set(
            positionKey(
              unresolvedPosition,
            ),
            unresolvedPosition,
          )
        }

        if (!secondPosition) {
          const unresolvedPosition = {
            claimId:
              claim.id,

            citationId:
              contradicting.citationId,

            evidenceRef:
              contradicting.evidenceRef,
          }

          unresolved.set(
            positionKey(
              unresolvedPosition,
            ),
            unresolvedPosition,
          )
        }

        if (
          !firstPosition ||
          !secondPosition
        ) {
          continue
        }

        candidates.push({
          id:
            candidateID(
              claim.id,
              firstPosition
                .citationId,
              secondPosition
                .citationId,
            ),

          subjectId:
            claim.id,

          subjectText:
            claim.text,

          firstPosition,

          secondPosition,
        })
      }
    }
  }

  const unresolvedPositions =
    [
      ...unresolved.values(),
    ]

  const complete =
    unresolvedPositions.length ===
    0

  return {
    provenance,

    complete,

    reasons:
      complete
        ? []
        : [
            'unresolved_evidence_text',
          ],

    candidates,

    unresolvedPositions,
  }
}
