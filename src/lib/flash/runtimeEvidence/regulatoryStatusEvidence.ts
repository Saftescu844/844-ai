export type FlashRegulatoryStatusFindingType =
  | 'approvalOrAuthorization'
  | 'jurisdictionApplicability'
  | 'approvedIndicationOrUse'
  | 'researchUseOnly'
  | 'marketAvailability'
  | 'regulatoryChangeOrTransition'
  | 'otherRegulatoryStatus'

export type FlashRegulatoryStatusVerdict =
  | 'clear'
  | 'unclear'
  | 'conflicting'

export interface FlashRegulatoryStatusFinding {
  id: string

  type:
    FlashRegulatoryStatusFindingType

  verdict:
    FlashRegulatoryStatusVerdict

  /**
   * Locator către dovada regulatorie concretă:
   * document oficial, paragraf, claim id etc.
   */
  evidenceRef?: string | null
}

export interface FlashRegulatoryStatusEvidenceInput {
  /**
   * Spune dacă subiectul Flash-ului are efectiv
   * un statut regulator relevant pentru afirmațiile
   * publicate.
   *
   * Nu se derivează din clinicalValidationStatus.
   */
  regulatoryContextRelevant: boolean

  findings:
    FlashRegulatoryStatusFinding[]
}

export type FlashRegulatoryStatusReason =
  | 'regulatory_context_without_status_evidence'
  | 'clear_regulatory_status_without_evidence'
  | 'regulatory_status_unclear'
  | 'regulatory_status_conflicting'

export interface EvaluatedFlashRegulatoryStatusFinding {
  id: string

  type:
    FlashRegulatoryStatusFindingType

  verdict:
    FlashRegulatoryStatusVerdict

  evidencePresent: boolean

  /**
   * Un status "clear" este acceptat ca atare doar
   * dacă este legat de evidence concret.
   */
  clearAndSupported: boolean

  reviewRequired: boolean
}

export interface FlashRegulatoryStatusEvidence {
  regulatoryStatusUnclear: boolean

  reasons:
    FlashRegulatoryStatusReason[]

  evaluatedFindings:
    EvaluatedFlashRegulatoryStatusFinding[]
}

function hasEvidence(
  finding:
    FlashRegulatoryStatusFinding,
): boolean {
  return (
    typeof finding.evidenceRef ===
      'string' &&
    finding.evidenceRef
      .trim()
      .length > 0
  )
}

export function evaluateFlashRegulatoryStatus(
  input:
    FlashRegulatoryStatusEvidenceInput,
): FlashRegulatoryStatusEvidence {
  const reasons =
    new Set<
      FlashRegulatoryStatusReason
    >()

  if (
    input.regulatoryContextRelevant &&
    input.findings.length === 0
  ) {
    reasons.add(
      'regulatory_context_without_status_evidence',
    )
  }

  const evaluatedFindings =
    input.findings.map(
      (
        finding,
      ): EvaluatedFlashRegulatoryStatusFinding => {
        const evidencePresent =
          hasEvidence(finding)

        const clearAndSupported =
          finding.verdict ===
            'clear' &&
          evidencePresent

        const reviewRequired =
          finding.verdict ===
            'unclear' ||
          finding.verdict ===
            'conflicting' ||
          (
            finding.verdict ===
              'clear' &&
            !evidencePresent
          )

        if (
          finding.verdict ===
            'clear' &&
          !evidencePresent
        ) {
          reasons.add(
            'clear_regulatory_status_without_evidence',
          )
        }

        if (
          finding.verdict ===
            'unclear'
        ) {
          reasons.add(
            'regulatory_status_unclear',
          )
        }

        if (
          finding.verdict ===
            'conflicting'
        ) {
          reasons.add(
            'regulatory_status_conflicting',
          )
        }

        return {
          id: finding.id,
          type: finding.type,
          verdict:
            finding.verdict,
          evidencePresent,
          clearAndSupported,
          reviewRequired,
        }
      },
    )

  const missingRelevantStatus =
    input.regulatoryContextRelevant &&
    input.findings.length === 0

  return {
    regulatoryStatusUnclear:
      missingRelevantStatus ||
      evaluatedFindings.some(
        finding =>
          finding.reviewRequired,
      ),

    reasons:
      [...reasons],

    evaluatedFindings,
  }
}
