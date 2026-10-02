import type {
  FlashSafetyEvidenceInput,
  FlashSafetyFindingType,
  FlashSafetyFindingVerdict,
} from '../runtimeEvidence/safetyEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashSafetySemanticFindingOutput {
  id:
    string

  type:
    FlashSafetyFindingType

  verdict:
    FlashSafetyFindingVerdict

  /**
   * Fragment textual pe care detectorul îl indică
   * drept dovadă.
   *
   * Important:
   * modelul NU furnizează evidenceRef.
   * Locatorul este construit deterministic doar dacă
   * acest text există exact în SemanticDocument.
   */
  evidenceText:
    string | null
}

export interface FlashSafetySemanticOutput {
  findings:
    FlashSafetySemanticFindingOutput[]
}

const SAFETY_FINDING_TYPES =
  new Set<FlashSafetyFindingType>([
    'generalSafetyConcern',
    'individualDiagnosis',
    'individualTreatmentRecommendation',
    'medicationChange',
    'dangerousInstructions',
    'fundamentalEditorialViolation',
  ])

const SAFETY_FINDING_VERDICTS =
  new Set<FlashSafetyFindingVerdict>([
    'present',
    'absent',
    'uncertain',
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

function cleanRequiredString(
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

function cleanEvidenceText(
  value:
    unknown,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null
  }

  if (
    typeof value !==
    'string'
  ) {
    invalidOutput()
  }

  const cleaned =
    value.trim()

  return cleaned
    ? cleaned
    : null
}

function parseFinding(
  value:
    unknown,
): FlashSafetySemanticFindingOutput {
  const finding =
    asRecord(value)

  if (!finding) {
    invalidOutput()
  }

  if (
    !hasOnlyKeys(
      finding,
      [
        'id',
        'type',
        'verdict',
        'evidenceText',
      ],
    )
  ) {
    invalidOutput()
  }

  const id =
    cleanRequiredString(
      finding.id,
    )

  if (
    typeof finding.type !==
      'string' ||
    !SAFETY_FINDING_TYPES.has(
      finding.type as
        FlashSafetyFindingType,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof finding.verdict !==
      'string' ||
    !SAFETY_FINDING_VERDICTS.has(
      finding.verdict as
        FlashSafetyFindingVerdict,
    )
  ) {
    invalidOutput()
  }

  return {
    id,

    type:
      finding.type as
        FlashSafetyFindingType,

    verdict:
      finding.verdict as
        FlashSafetyFindingVerdict,

    evidenceText:
      cleanEvidenceText(
        finding.evidenceText,
      ),
  }
}

/**
 * Parser strict al outputului Safety.
 *
 * Acceptă exclusiv JSON brut.
 * Nu repară JSON.
 * Nu elimină code fences.
 * Nu ghicește câmpuri.
 */
export function parseFlashSafetySemanticOutput(
  raw:
    string,
): FlashSafetySemanticOutput {
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
        'findings',
      ],
    ) ||
    !Array.isArray(
      root.findings,
    )
  ) {
    invalidOutput()
  }

  const findings =
    root.findings.map(
      parseFinding,
    )

  const ids =
    findings.map(
      finding =>
        finding.id,
    )

  if (
    new Set(ids).size !==
    ids.length
  ) {
    invalidOutput()
  }

  return {
    findings,
  }
}

function resolveEvidenceRef({
  document,
  evidenceText,
}: {
  document:
    FlashSemanticDocument

  evidenceText:
    string | null
}): string | null {
  if (!evidenceText) {
    return null
  }

  const candidates:
    Array<{
      field:
        'title' | 'excerpt' | 'body'
      text:
        string
    }> = [
      {
        field:
          'title',
        text:
          document.title,
      },

      ...(document.excerpt
        ? [
            {
              field:
                'excerpt' as const,
              text:
                document.excerpt,
            },
          ]
        : []),

      {
        field:
          'body',
        text:
          document.bodyText,
      },
    ]

  for (
    const candidate
    of candidates
  ) {
    const start =
      candidate.text.indexOf(
        evidenceText,
      )

    if (start === -1) {
      continue
    }

    const end =
      start +
      evidenceText.length

    return (
      `${candidate.field}:` +
      `${start}-${end}`
    )
  }

  return null
}

/**
 * Adaptează outputul detectorului la contractul
 * deterministic Safety Evidence.
 *
 * Un finding PRESENT cu evidenceText inventat
 * primește evidenceRef=null și, prin evaluatorul
 * existent, poate cere REVIEW dar nu poate produce
 * singur BLOCK confirmat.
 */
export function toFlashSafetyEvidenceInput({
  document,
  output,
}: {
  document:
    FlashSemanticDocument

  output:
    FlashSafetySemanticOutput
}): FlashSafetyEvidenceInput {
  return {
    findings:
      output.findings.map(
        finding => ({
          id:
            finding.id,

          type:
            finding.type,

          verdict:
            finding.verdict,

          evidenceRef:
            finding.verdict ===
              'absent'
              ? null
              : resolveEvidenceRef({
                  document,

                  evidenceText:
                    finding
                      .evidenceText,
                }),
        }),
      ),
  }
}
