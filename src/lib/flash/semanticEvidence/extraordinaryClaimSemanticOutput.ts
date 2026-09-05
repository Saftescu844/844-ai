import type {
  FlashExtraordinaryClaimEvidenceInput,
  FlashExtraordinaryClaimFindingType,
  FlashExtraordinaryClaimVerdict,
} from '../runtimeEvidence/extraordinaryClaimEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashExtraordinaryClaimSemanticFindingOutput {
  id:
    string

  type:
    FlashExtraordinaryClaimFindingType

  verdict:
    FlashExtraordinaryClaimVerdict

  /**
   * Fragment textual indicat de detector.
   *
   * Modelul NU furnizează direct evidenceRef.
   * Locatorul este construit deterministic numai
   * dacă fragmentul există exact în document.
   */
  evidenceText:
    string | null
}

export interface FlashExtraordinaryClaimSemanticOutput {
  findings:
    FlashExtraordinaryClaimSemanticFindingOutput[]
}

const EXTRAORDINARY_CLAIM_TYPES =
  new Set<
    FlashExtraordinaryClaimFindingType
  >([
    'breakthroughOrCureClaim',
    'nearPerfectPerformance',
    'broadOrUniversalEffect',
    'replacementOfEstablishedPractice',
    'unprecedentedCapability',
    'otherExtraordinaryClaim',
  ])

const EXTRAORDINARY_CLAIM_VERDICTS =
  new Set<
    FlashExtraordinaryClaimVerdict
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
): FlashExtraordinaryClaimSemanticFindingOutput {
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
    !EXTRAORDINARY_CLAIM_TYPES.has(
      finding.type as
        FlashExtraordinaryClaimFindingType,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof finding.verdict !==
      'string' ||
    !EXTRAORDINARY_CLAIM_VERDICTS.has(
      finding.verdict as
        FlashExtraordinaryClaimVerdict,
    )
  ) {
    invalidOutput()
  }

  return {
    id,

    type:
      finding.type as
        FlashExtraordinaryClaimFindingType,

    verdict:
      finding.verdict as
        FlashExtraordinaryClaimVerdict,

    evidenceText:
      cleanEvidenceText(
        finding.evidenceText,
      ),
  }
}

/**
 * Parser strict.
 *
 * Acceptă numai JSON brut.
 * Nu repară JSON.
 * Nu elimină code fences.
 * Nu acceptă câmpuri suplimentare.
 */
export function parseFlashExtraordinaryClaimSemanticOutput(
  raw:
    string,
): FlashExtraordinaryClaimSemanticOutput {
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
 * Transformă outputul detectorului în inputul
 * evaluatorului deterministic Extraordinary Claim.
 *
 * Important:
 * - nu verifică adevărul afirmației;
 * - nu inferă extraordinary din keywords;
 * - evidenceRef apare doar pentru text ancorat;
 * - absent nu primește evidenceRef.
 */
export function toFlashExtraordinaryClaimEvidenceInput({
  document,
  output,
}: {
  document:
    FlashSemanticDocument

  output:
    FlashExtraordinaryClaimSemanticOutput
}): FlashExtraordinaryClaimEvidenceInput {
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
