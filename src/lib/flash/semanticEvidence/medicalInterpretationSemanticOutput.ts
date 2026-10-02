import type {
  FlashMedicalInterpretationEvidenceInput,
  FlashMedicalInterpretationFindingType,
  FlashMedicalInterpretationVerdict,
} from '../runtimeEvidence/medicalInterpretationEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashMedicalInterpretationSemanticFindingOutput {
  id:
    string

  type:
    FlashMedicalInterpretationFindingType

  verdict:
    FlashMedicalInterpretationVerdict

  /**
   * Fragment textual indicat de detector.
   *
   * Modelul NU poate furniza direct evidenceRef.
   * Locatorul este construit deterministic doar dacă
   * fragmentul există exact în SemanticDocument.
   */
  evidenceText:
    string | null
}

export interface FlashMedicalInterpretationSemanticOutput {
  findings:
    FlashMedicalInterpretationSemanticFindingOutput[]
}

const MEDICAL_INTERPRETATION_TYPES =
  new Set<
    FlashMedicalInterpretationFindingType
  >([
    'clinicalSignificance',
    'patientApplicability',
    'comparativeClinicalClaim',
    'benefitRiskInterpretation',
    'clinicalDecisionImplication',
    'otherMedicalInterpretation',
  ])

const MEDICAL_INTERPRETATION_VERDICTS =
  new Set<
    FlashMedicalInterpretationVerdict
  >([
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
): FlashMedicalInterpretationSemanticFindingOutput {
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
    !MEDICAL_INTERPRETATION_TYPES.has(
      finding.type as
        FlashMedicalInterpretationFindingType,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof finding.verdict !==
      'string' ||
    !MEDICAL_INTERPRETATION_VERDICTS.has(
      finding.verdict as
        FlashMedicalInterpretationVerdict,
    )
  ) {
    invalidOutput()
  }

  return {
    id,

    type:
      finding.type as
        FlashMedicalInterpretationFindingType,

    verdict:
      finding.verdict as
        FlashMedicalInterpretationVerdict,

    evidenceText:
      cleanEvidenceText(
        finding.evidenceText,
      ),
  }
}

/**
 * Parser strict.
 *
 * Acceptă exclusiv JSON brut.
 * Nu repară JSON.
 * Nu elimină code fences.
 * Nu acceptă câmpuri suplimentare.
 */
export function parseFlashMedicalInterpretationSemanticOutput(
  raw:
    string,
): FlashMedicalInterpretationSemanticOutput {
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
 * Adaptează outputul semantic la contractul
 * deterministic Medical Interpretation Evidence.
 *
 * Important:
 * - health-related NU este inferat aici;
 * - verdictul modelului nu este schimbat;
 * - evidenceRef apare doar pentru text ancorat exact;
 * - absent nu primește niciodată evidenceRef.
 */
export function toFlashMedicalInterpretationEvidenceInput({
  document,
  output,
}: {
  document:
    FlashSemanticDocument

  output:
    FlashMedicalInterpretationSemanticOutput
}): FlashMedicalInterpretationEvidenceInput {
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
