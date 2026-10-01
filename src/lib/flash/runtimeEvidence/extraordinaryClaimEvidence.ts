export type FlashExtraordinaryClaimFindingType =
  | 'breakthroughOrCureClaim'
  | 'nearPerfectPerformance'
  | 'broadOrUniversalEffect'
  | 'replacementOfEstablishedPractice'
  | 'unprecedentedCapability'
  | 'otherExtraordinaryClaim'

export type FlashExtraordinaryClaimVerdict =
  | 'present'
  | 'absent'
  | 'uncertain'

export interface FlashExtraordinaryClaimFinding {
  id: string

  type:
    FlashExtraordinaryClaimFindingType

  verdict:
    FlashExtraordinaryClaimVerdict

  /**
   * Locator către afirmația concretă evaluată:
   * claim id, paragraf, fragment hash etc.
   */
  evidenceRef?: string | null
}

export interface FlashExtraordinaryClaimEvidenceInput {
  findings:
    FlashExtraordinaryClaimFinding[]
}

export type FlashExtraordinaryClaimReason =
  | 'extraordinary_claim_confirmed'
  | 'uncertain_extraordinary_claim'
  | 'present_extraordinary_claim_without_evidence'

export interface EvaluatedFlashExtraordinaryClaimFinding {
  id: string

  type:
    FlashExtraordinaryClaimFindingType

  verdict:
    FlashExtraordinaryClaimVerdict

  evidencePresent: boolean

  /**
   * Finding prezent și legat de un fragment concret.
   *
   * Confirmat aici înseamnă confirmarea caracterului
   * extraordinar al formulării, NU confirmarea
   * adevărului afirmației.
   */
  confirmed: boolean

  /**
   * Afirmația cere verificare editorială suplimentară.
   */
  reviewRequired: boolean
}

export interface FlashExtraordinaryClaimEvidence {
  extraordinaryClaimNeedsReview: boolean

  reasons:
    FlashExtraordinaryClaimReason[]

  evaluatedFindings:
    EvaluatedFlashExtraordinaryClaimFinding[]
}

function hasEvidence(
  finding:
    FlashExtraordinaryClaimFinding,
): boolean {
  return (
    typeof finding.evidenceRef ===
      'string' &&
    finding.evidenceRef
      .trim()
      .length > 0
  )
}

export function evaluateFlashExtraordinaryClaims(
  input:
    FlashExtraordinaryClaimEvidenceInput,
): FlashExtraordinaryClaimEvidence {
  const reasons =
    new Set<
      FlashExtraordinaryClaimReason
    >()

  const evaluatedFindings =
    input.findings.map(
      (
        finding,
      ): EvaluatedFlashExtraordinaryClaimFinding => {
        const evidencePresent =
          hasEvidence(finding)

        const confirmed =
          finding.verdict ===
            'present' &&
          evidencePresent

        /**
         * Atât un finding prezent, cât și unul
         * incert trebuie revizuite.
         *
         * Niciunul nu produce BLOCK aici.
         */
        const reviewRequired =
          finding.verdict ===
            'present' ||
          finding.verdict ===
            'uncertain'

        if (confirmed) {
          reasons.add(
            'extraordinary_claim_confirmed',
          )
        }

        if (
          finding.verdict ===
            'uncertain'
        ) {
          reasons.add(
            'uncertain_extraordinary_claim',
          )
        }

        if (
          finding.verdict ===
            'present' &&
          !evidencePresent
        ) {
          reasons.add(
            'present_extraordinary_claim_without_evidence',
          )
        }

        return {
          id: finding.id,
          type: finding.type,
          verdict:
            finding.verdict,
          evidencePresent,
          confirmed,
          reviewRequired,
        }
      },
    )

  return {
    extraordinaryClaimNeedsReview:
      evaluatedFindings.some(
        finding =>
          finding.reviewRequired,
      ),

    reasons:
      [...reasons],

    evaluatedFindings,
  }
}
