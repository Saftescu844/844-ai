export type FlashMedicalInterpretationFindingType =
  | 'clinicalSignificance'
  | 'patientApplicability'
  | 'comparativeClinicalClaim'
  | 'benefitRiskInterpretation'
  | 'clinicalDecisionImplication'
  | 'otherMedicalInterpretation'

export type FlashMedicalInterpretationVerdict =
  | 'present'
  | 'absent'
  | 'uncertain'

export interface FlashMedicalInterpretationFinding {
  id: string

  type:
    FlashMedicalInterpretationFindingType

  verdict:
    FlashMedicalInterpretationVerdict

  /**
   * Locator către fragmentul concret evaluat:
   * claim id, paragraf, fragment hash etc.
   */
  evidenceRef?: string | null
}

export interface FlashMedicalInterpretationEvidenceInput {
  findings:
    FlashMedicalInterpretationFinding[]
}

export type FlashMedicalInterpretationReason =
  | 'important_medical_interpretation_confirmed'
  | 'uncertain_medical_interpretation'
  | 'present_interpretation_without_evidence'

export interface EvaluatedFlashMedicalInterpretationFinding {
  id: string

  type:
    FlashMedicalInterpretationFindingType

  verdict:
    FlashMedicalInterpretationVerdict

  evidencePresent: boolean

  /**
   * Finding prezent și ancorat într-o dovadă concretă.
   */
  confirmed: boolean

  /**
   * Cere review editorial/medical.
   *
   * Și incertitudinea este suficientă pentru REVIEW,
   * dar nu este declarată automat "confirmed".
   */
  reviewRequired: boolean
}

export interface FlashMedicalInterpretationEvidence {
  importantMedicalInterpretation: boolean

  reasons:
    FlashMedicalInterpretationReason[]

  evaluatedFindings:
    EvaluatedFlashMedicalInterpretationFinding[]
}

function hasEvidence(
  finding:
    FlashMedicalInterpretationFinding,
): boolean {
  return (
    typeof finding.evidenceRef ===
      'string' &&
    finding.evidenceRef
      .trim()
      .length > 0
  )
}

export function evaluateFlashMedicalInterpretation(
  input:
    FlashMedicalInterpretationEvidenceInput,
): FlashMedicalInterpretationEvidence {
  const reasons =
    new Set<
      FlashMedicalInterpretationReason
    >()

  const evaluatedFindings =
    input.findings.map(
      (
        finding,
      ): EvaluatedFlashMedicalInterpretationFinding => {
        const evidencePresent =
          hasEvidence(finding)

        const confirmed =
          finding.verdict ===
            'present' &&
          evidencePresent

        const reviewRequired =
          finding.verdict ===
            'present' ||
          finding.verdict ===
            'uncertain'

        if (confirmed) {
          reasons.add(
            'important_medical_interpretation_confirmed',
          )
        }

        if (
          finding.verdict ===
            'uncertain'
        ) {
          reasons.add(
            'uncertain_medical_interpretation',
          )
        }

        if (
          finding.verdict ===
            'present' &&
          !evidencePresent
        ) {
          reasons.add(
            'present_interpretation_without_evidence',
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
    /**
     * Important: acest boolean este gate-ul de REVIEW.
     *
     * Un finding incert rămâne conservator în REVIEW,
     * fără să fie declarat confirmat.
     */
    importantMedicalInterpretation:
      evaluatedFindings.some(
        finding =>
          finding.reviewRequired,
      ),

    reasons:
      [...reasons],

    evaluatedFindings,
  }
}
