import type {
  FactualCitationID,
} from '../runtimeEvidence/factualSupportEvidence'

import type {
  FlashContradictionEvidenceInput,
  FlashContradictionRelation,
} from '../runtimeEvidence/contradictionEvidence'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

/**
 * Poziție deja ancorată într-o citare / sursă.
 *
 * citationId și evidenceRef NU provin din outputul
 * modelului semantic.
 */
export interface FlashContradictionSemanticPosition {
  citationId:
    FactualCitationID

  evidenceRef:
    string

  /**
   * Fragmentul concret pus la dispoziția modelului
   * pentru comparație.
   *
   * Acest text este input pentru clasificare;
   * locatorul autoritativ rămâne evidenceRef.
   */
  evidenceText:
    string
}

/**
 * Pereche pregătită upstream pentru comparație.
 *
 * Cele două poziții trebuie să privească același
 * claim / subiect factual.
 */
export interface FlashContradictionSemanticCandidate {
  id:
    string

  subjectId:
    string

  subjectText:
    string

  firstPosition:
    FlashContradictionSemanticPosition

  secondPosition:
    FlashContradictionSemanticPosition
}

/**
 * Modelul are voie să decidă numai relația
 * semantică și cele două proprietăți comparative.
 *
 * Nu poate furniza sau modifica:
 * - subjectId;
 * - citationId;
 * - evidenceRef.
 */
export interface FlashContradictionSemanticCaseOutput {
  id:
    string

  relation:
    FlashContradictionRelation

  comparable:
    boolean

  material:
    boolean
}

export interface FlashContradictionSemanticOutput {
  cases:
    FlashContradictionSemanticCaseOutput[]
}

const CONTRADICTION_RELATIONS =
  new Set<
    FlashContradictionRelation
  >([
    'contestation',
    'materialConflict',
    'contextDifference',
    'newerEvidence',
  ])

type UnknownRecord =
  Record<string, unknown>

function invalidOutput(): never {
  throw new FlashSemanticEvidenceProducerError(
    'invalid_output',
  )
}

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as UnknownRecord
}

function hasOnlyKeys(
  record:
    UnknownRecord,
  allowedKeys:
    readonly string[],
): boolean {
  const allowed =
    new Set(
      allowedKeys,
    )

  return Object
    .keys(record)
    .every(
      key =>
        allowed.has(key),
    )
}

function requiredString(
  value:
    unknown,
): string {
  if (
    typeof value !==
    'string'
  ) {
    invalidOutput()
  }

  const cleaned =
    value.trim()

  if (!cleaned) {
    invalidOutput()
  }

  return cleaned
}

function parseCase(
  value:
    unknown,
): FlashContradictionSemanticCaseOutput {
  const item =
    asRecord(value)

  if (!item) {
    invalidOutput()
  }

  if (
    !hasOnlyKeys(
      item,
      [
        'id',
        'relation',
        'comparable',
        'material',
      ],
    )
  ) {
    invalidOutput()
  }

  const id =
    requiredString(
      item.id,
    )

  if (
    typeof item.relation !==
      'string' ||
    !CONTRADICTION_RELATIONS.has(
      item.relation as
        FlashContradictionRelation,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof item.comparable !==
      'boolean' ||
    typeof item.material !==
      'boolean'
  ) {
    invalidOutput()
  }

  return {
    id,

    relation:
      item.relation as
        FlashContradictionRelation,

    comparable:
      item.comparable,

    material:
      item.material,
  }
}

/**
 * Parser strict pentru outputul semantic.
 *
 * Modelul nu poate trimite citationId,
 * evidenceRef, subjectId sau alte câmpuri.
 */
export function parseFlashContradictionSemanticOutput(
  raw:
    string,
): FlashContradictionSemanticOutput {
  let parsed:
    unknown

  try {
    parsed =
      JSON.parse(raw)
  } catch {
    invalidOutput()
  }

  const root =
    asRecord(parsed)

  if (!root) {
    invalidOutput()
  }

  if (
    !hasOnlyKeys(
      root,
      [
        'cases',
      ],
    ) ||
    !Array.isArray(
      root.cases,
    )
  ) {
    invalidOutput()
  }

  const cases =
    root.cases.map(
      parseCase,
    )

  const ids =
    cases.map(
      item =>
        item.id,
    )

  if (
    new Set(ids).size !==
    ids.length
  ) {
    invalidOutput()
  }

  return {
    cases,
  }
}

/**
 * Leagă outputul semantic de candidatele autoritative.
 *
 * Cerem acoperire exactă:
 * - fiecare candidate apare exact o dată;
 * - modelul nu poate introduce case-uri noi;
 * - modelul nu poate omite în tăcere un candidate.
 */
export function toFlashContradictionEvidenceInput({
  candidates,
  output,
}: {
  candidates:
    FlashContradictionSemanticCandidate[]

  output:
    FlashContradictionSemanticOutput
}): FlashContradictionEvidenceInput {
  const candidateIDs =
    candidates.map(
      candidate =>
        candidate.id,
    )

  if (
    new Set(
      candidateIDs,
    ).size !==
    candidateIDs.length
  ) {
    invalidOutput()
  }

  if (
    output.cases.length !==
    candidates.length
  ) {
    invalidOutput()
  }

  const outputByID =
    new Map(
      output.cases.map(
        item => [
          item.id,
          item,
        ],
      ),
    )

  if (
    outputByID.size !==
    candidates.length
  ) {
    invalidOutput()
  }

  return {
    cases:
      candidates.map(
        candidate => {
          const semanticCase =
            outputByID.get(
              candidate.id,
            )

          if (!semanticCase) {
            invalidOutput()
          }

          return {
            id:
              candidate.id,

            subjectId:
              candidate.subjectId,

            firstPosition: {
              citationId:
                candidate
                  .firstPosition
                  .citationId,

              evidenceRef:
                candidate
                  .firstPosition
                  .evidenceRef,
            },

            secondPosition: {
              citationId:
                candidate
                  .secondPosition
                  .citationId,

              evidenceRef:
                candidate
                  .secondPosition
                  .evidenceRef,
            },

            relation:
              semanticCase.relation,

            comparable:
              semanticCase.comparable,

            material:
              semanticCase.material,
          }
        },
      ),
  }
}
