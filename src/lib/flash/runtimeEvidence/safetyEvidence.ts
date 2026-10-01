export type FlashSafetyFindingType =
  | 'generalSafetyConcern'
  | 'individualDiagnosis'
  | 'individualTreatmentRecommendation'
  | 'medicationChange'
  | 'dangerousInstructions'
  | 'fundamentalEditorialViolation'

export type FlashSafetyFindingVerdict =
  | 'present'
  | 'absent'
  | 'uncertain'

export interface FlashSafetyFinding {
  id: string

  type:
    FlashSafetyFindingType

  verdict:
    FlashSafetyFindingVerdict

  /**
   * Locator către fragmentul concret evaluat:
   * paragraf, claim id, fragment hash etc.
   *
   * Un BLOCK nu este confirmat fără
   * evidenceRef concret.
   */
  evidenceRef?: string | null
}

export interface FlashSafetyEvidenceInput {
  findings:
    FlashSafetyFinding[]
}

export type FlashSafetyEvidenceReason =
  | 'general_safety_concern'
  | 'uncertain_safety_finding'
  | 'present_finding_without_evidence'
  | 'individual_diagnosis_confirmed'
  | 'individual_treatment_recommendation_confirmed'
  | 'medication_change_confirmed'
  | 'dangerous_instructions_confirmed'
  | 'fundamental_editorial_violation_confirmed'

export interface EvaluatedFlashSafetyFinding {
  id: string

  type:
    FlashSafetyFindingType

  verdict:
    FlashSafetyFindingVerdict

  evidencePresent: boolean

  /**
   * Finding suficient de clar pentru
   * un flag BLOCK specific.
   */
  blockConfirmed: boolean

  /**
   * Finding care cere intervenție umană,
   * dar nu justifică singur BLOCK.
   */
  reviewRequired: boolean
}

export interface FlashSafetyEvidence {
  safetyGateTriggered: boolean

  individualDiagnosis: boolean
  individualTreatmentRecommendation: boolean
  medicationChange: boolean
  dangerousInstructions: boolean
  fundamentalEditorialViolation: boolean

  reasons:
    FlashSafetyEvidenceReason[]

  evaluatedFindings:
    EvaluatedFlashSafetyFinding[]
}

function hasEvidence(
  finding:
    FlashSafetyFinding,
): boolean {
  return (
    typeof finding.evidenceRef ===
      'string' &&
    finding.evidenceRef
      .trim()
      .length > 0
  )
}

function isBlockFinding(
  type:
    FlashSafetyFindingType,
): boolean {
  return (
    type !==
    'generalSafetyConcern'
  )
}

function confirmedReason(
  type:
    Exclude<
      FlashSafetyFindingType,
      'generalSafetyConcern'
    >,
): FlashSafetyEvidenceReason {
  switch (type) {
    case 'individualDiagnosis':
      return 'individual_diagnosis_confirmed'

    case 'individualTreatmentRecommendation':
      return 'individual_treatment_recommendation_confirmed'

    case 'medicationChange':
      return 'medication_change_confirmed'

    case 'dangerousInstructions':
      return 'dangerous_instructions_confirmed'

    case 'fundamentalEditorialViolation':
      return 'fundamental_editorial_violation_confirmed'
  }
}

export function evaluateFlashSafety(
  input:
    FlashSafetyEvidenceInput,
): FlashSafetyEvidence {
  const reasons =
    new Set<
      FlashSafetyEvidenceReason
    >()

  let individualDiagnosis =
    false

  let individualTreatmentRecommendation =
    false

  let medicationChange =
    false

  let dangerousInstructions =
    false

  let fundamentalEditorialViolation =
    false

  const evaluatedFindings =
    input.findings.map(
      (
        finding,
      ): EvaluatedFlashSafetyFinding => {
        const evidencePresent =
          hasEvidence(
            finding,
          )

        const blockConfirmed =
          finding.verdict ===
            'present' &&
          evidencePresent &&
          isBlockFinding(
            finding.type,
          )

        /**
         * REVIEW este necesar când:
         * - avem un concern general prezent;
         * - evaluatorul este incert;
         * - un finding de tip BLOCK este declarat
         *   prezent, dar nu are evidence concret.
         *
         * Astfel, incertitudinea nu devine
         * automat BLOCK.
         */
        const reviewRequired =
          finding.verdict ===
            'uncertain' ||
          (
            finding.verdict ===
              'present' &&
            finding.type ===
              'generalSafetyConcern'
          ) ||
          (
            finding.verdict ===
              'present' &&
            isBlockFinding(
              finding.type,
            ) &&
            !evidencePresent
          )

        if (
          finding.verdict ===
            'uncertain'
        ) {
          reasons.add(
            'uncertain_safety_finding',
          )
        }

        if (
          finding.verdict ===
            'present' &&
          finding.type ===
            'generalSafetyConcern'
        ) {
          reasons.add(
            'general_safety_concern',
          )
        }

        if (
          finding.verdict ===
            'present' &&
          isBlockFinding(
            finding.type,
          ) &&
          !evidencePresent
        ) {
          reasons.add(
            'present_finding_without_evidence',
          )
        }

        if (blockConfirmed) {
          const blockType =
            finding.type as Exclude<
              FlashSafetyFindingType,
              'generalSafetyConcern'
            >

          reasons.add(
            confirmedReason(
              blockType,
            ),
          )

          switch (blockType) {
            case 'individualDiagnosis':
              individualDiagnosis =
                true
              break

            case 'individualTreatmentRecommendation':
              individualTreatmentRecommendation =
                true
              break

            case 'medicationChange':
              medicationChange =
                true
              break

            case 'dangerousInstructions':
              dangerousInstructions =
                true
              break

            case 'fundamentalEditorialViolation':
              fundamentalEditorialViolation =
                true
              break
          }
        }

        return {
          id: finding.id,
          type: finding.type,
          verdict:
            finding.verdict,
          evidencePresent,
          blockConfirmed,
          reviewRequired,
        }
      },
    )

  return {
    safetyGateTriggered:
      evaluatedFindings.some(
        finding =>
          finding.reviewRequired,
      ),

    individualDiagnosis,
    individualTreatmentRecommendation,
    medicationChange,
    dangerousInstructions,
    fundamentalEditorialViolation,

    reasons:
      [...reasons],

    evaluatedFindings,
  }
}
