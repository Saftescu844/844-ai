import type {
  FactualCitationID,
} from './factualSupportEvidence'

export interface FlashContradictionPosition {
  citationId?: FactualCitationID | null

  /**
   * Locator către dovada concretă din sursă:
   * secțiune, paragraf, fragment hash etc.
   */
  evidenceRef?: string | null
}

export type FlashContradictionRelation =
  | 'contestation'
  | 'materialConflict'
  | 'contextDifference'
  | 'newerEvidence'

export interface FlashContradictionCase {
  id: string

  /**
   * Claim-ul / subiectul factual asupra căruia există
   * două poziții sau o contestare.
   */
  subjectId: string

  firstPosition: FlashContradictionPosition
  secondPosition: FlashContradictionPosition

  relation: FlashContradictionRelation

  /**
   * Cele două poziții se referă efectiv la aceeași
   * populație, perioadă, jurisdicție, produs etc.
   */
  comparable: boolean

  /**
   * Conflictul ar schimba semnificativ concluzia
   * sau formularea Flash-ului.
   */
  material: boolean
}

export interface FlashContradictionEvidenceInput {
  cases: FlashContradictionCase[]
}

export interface EvaluatedFlashContradictionCase {
  id: string
  subjectId: string
  relation: FlashContradictionRelation

  firstEvidencePresent: boolean
  secondEvidencePresent: boolean

  comparable: boolean
  material: boolean

  materialConflictConfirmed: boolean
  articleDisclosureSuggested: boolean
}

export interface FlashContradictionEvidence {
  materialContradictions: boolean

  /**
   * Semnal pentru etapa editorială:
   * articolul ar trebui să menționeze existența
   * unei contestări/conflict relevant.
   *
   * Nu înseamnă că cele două poziții au
   * automat aceeași greutate.
   */
  articleDisclosureSuggested: boolean

  evaluatedCases: EvaluatedFlashContradictionCase[]
}

function hasEvidence(
  position: FlashContradictionPosition,
): boolean {
  return (
    position.citationId !== null &&
    position.citationId !== undefined &&
    typeof position.evidenceRef ===
      'string' &&
    position.evidenceRef.trim().length > 0
  )
}

export function evaluateFlashContradictions(
  input: FlashContradictionEvidenceInput,
): FlashContradictionEvidence {
  const evaluatedCases =
    input.cases.map(
      (
        contradictionCase,
      ): EvaluatedFlashContradictionCase => {
        const firstEvidencePresent =
          hasEvidence(
            contradictionCase.firstPosition,
          )

        const secondEvidencePresent =
          hasEvidence(
            contradictionCase.secondPosition,
          )

        /**
         * Nu declarăm contradicție materială doar
         * pentru că cineva contestă o afirmație.
         *
         * Cerem:
         * - conflict declarat material;
         * - ambele poziții cu evidence concret;
         * - pozițiile comparabile;
         * - impact material asupra concluziei.
         */
        const materialConflictConfirmed =
          contradictionCase.relation ===
            'materialConflict' &&
          firstEvidencePresent &&
          secondEvidencePresent &&
          contradictionCase.comparable &&
          contradictionCase.material

        /**
         * O contestare relevantă merită să poată fi
         * marcată editorial chiar dacă nu îndeplinește
         * standardul pentru materialContradictions.
         *
         * contextDifference / newerEvidence nu sunt,
         * prin ele însele, dispute ce trebuie marcate.
         */
        const articleDisclosureSuggested =
          contradictionCase.relation ===
            'contestation' ||
          contradictionCase.relation ===
            'materialConflict'

        return {
          id: contradictionCase.id,
          subjectId:
            contradictionCase.subjectId,
          relation:
            contradictionCase.relation,

          firstEvidencePresent,
          secondEvidencePresent,

          comparable:
            contradictionCase.comparable,
          material:
            contradictionCase.material,

          materialConflictConfirmed,
          articleDisclosureSuggested,
        }
      },
    )

  return {
    materialContradictions:
      evaluatedCases.some(
        item =>
          item.materialConflictConfirmed,
      ),

    articleDisclosureSuggested:
      evaluatedCases.some(
        item =>
          item.articleDisclosureSuggested,
      ),

    evaluatedCases,
  }
}
