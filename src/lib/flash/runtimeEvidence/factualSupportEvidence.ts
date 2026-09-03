export type FactualSupportStatus =
  | 'supported'
  | 'partial'
  | 'unsupported'
  | 'unverifiable'
  | 'contradicted'

export type FactualSupportReason =
  | 'no_claims'
  | 'claim_without_citation'
  | 'claim_partially_supported'
  | 'claim_unsupported'
  | 'claim_unverifiable'
  | 'claim_contradicted'
  | 'explicit_fabrication'
  | 'fabricated_citation'

export type FactualCitationID =
  | number
  | string

export interface FlashFactualClaim {
  id: string
  text: string
  citationIds?: FactualCitationID[]
  supportStatus: FactualSupportStatus

  /**
   * Aceste două semnale trebuie să provină dintr-o
   * constatare explicită de verificare.
   *
   * Lipsa suportului NU este suficientă pentru a le seta.
   */
  explicitlyFabricated?: boolean
  fabricatedCitation?: boolean
}

export interface FlashFactualSupportInput {
  claims: FlashFactualClaim[]
}

export interface FlashFactualClaimEvaluation {
  claimId: string
  citationCount: number
  passed: boolean
  reasons: Exclude<
    FactualSupportReason,
    'no_claims'
  >[]
}

export interface FlashFactualSupportEvidence {
  factsSupportedBySources: boolean
  fabricatedInformation: boolean
  fabricatedCitations: boolean
  reasons: FactualSupportReason[]
  claims: FlashFactualClaimEvaluation[]
}

function uniqueCitationCount(
  citationIds:
    FactualCitationID[] | undefined,
): number {
  if (!citationIds) {
    return 0
  }

  return new Set(
    citationIds.map(String),
  ).size
}

export function evaluateFlashFactualSupport(
  input: FlashFactualSupportInput,
): FlashFactualSupportEvidence {
  const reasons =
    new Set<FactualSupportReason>()

  if (input.claims.length === 0) {
    reasons.add('no_claims')
  }

  let fabricatedInformation = false
  let fabricatedCitations = false

  const claims =
    input.claims.map(
      (
        claim,
      ): FlashFactualClaimEvaluation => {
        const claimReasons:
          FlashFactualClaimEvaluation['reasons'] =
          []

        const citationCount =
          uniqueCitationCount(
            claim.citationIds,
          )

        if (citationCount === 0) {
          claimReasons.push(
            'claim_without_citation',
          )
        }

        switch (claim.supportStatus) {
          case 'supported':
            break

          case 'partial':
            claimReasons.push(
              'claim_partially_supported',
            )
            break

          case 'unsupported':
            claimReasons.push(
              'claim_unsupported',
            )
            break

          case 'unverifiable':
            claimReasons.push(
              'claim_unverifiable',
            )
            break

          case 'contradicted':
            claimReasons.push(
              'claim_contradicted',
            )
            break
        }

        if (
          claim.explicitlyFabricated === true
        ) {
          fabricatedInformation = true

          claimReasons.push(
            'explicit_fabrication',
          )
        }

        if (
          claim.fabricatedCitation === true
        ) {
          fabricatedCitations = true

          claimReasons.push(
            'fabricated_citation',
          )
        }

        for (
          const reason of claimReasons
        ) {
          reasons.add(reason)
        }

        return {
          claimId: claim.id,
          citationCount,
          passed:
            claimReasons.length === 0,
          reasons: claimReasons,
        }
      },
    )

  return {
    factsSupportedBySources:
      claims.length > 0 &&
      claims.every(
        claim => claim.passed,
      ),

    fabricatedInformation,
    fabricatedCitations,
    reasons: [...reasons],
    claims,
  }
}
