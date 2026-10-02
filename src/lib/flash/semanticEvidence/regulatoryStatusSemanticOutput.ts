import type {
  FlashRegulatoryStatusEvidenceInput,
  FlashRegulatoryStatusFindingType,
  FlashRegulatoryStatusVerdict,
} from '../runtimeEvidence/regulatoryStatusEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashRegulatoryStatusSemanticFindingOutput {
  id:
    string

  type:
    FlashRegulatoryStatusFindingType

  verdict:
    FlashRegulatoryStatusVerdict

  /**
   * Fragment textual indicat de detector.
   *
   * Modelul nu furnizează evidenceRef.
   * Locatorul este construit deterministic numai
   * dacă fragmentul există exact în document.
   */
  evidenceText:
    string | null
}

export interface FlashRegulatoryStatusSemanticOutput {
  /**
   * true numai când statusul regulator este material
   * pentru afirmațiile documentului.
   *
   * Simpla menționare a unui regulator, a medicinei
   * sau a unui produs nu trebuie inferată aici
   * deterministic.
   */
  regulatoryContextRelevant:
    boolean

  findings:
    FlashRegulatoryStatusSemanticFindingOutput[]
}

const REGULATORY_STATUS_TYPES =
  new Set<
    FlashRegulatoryStatusFindingType
  >([
    'approvalOrAuthorization',
    'jurisdictionApplicability',
    'approvedIndicationOrUse',
    'researchUseOnly',
    'marketAvailability',
    'regulatoryChangeOrTransition',
    'otherRegulatoryStatus',
  ])

const REGULATORY_STATUS_VERDICTS =
  new Set<
    FlashRegulatoryStatusVerdict
  >([
    'clear',
    'unclear',
    'conflicting',
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
): FlashRegulatoryStatusSemanticFindingOutput {
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
    !REGULATORY_STATUS_TYPES.has(
      finding.type as
        FlashRegulatoryStatusFindingType,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof finding.verdict !==
      'string' ||
    !REGULATORY_STATUS_VERDICTS.has(
      finding.verdict as
        FlashRegulatoryStatusVerdict,
    )
  ) {
    invalidOutput()
  }

  return {
    id,

    type:
      finding.type as
        FlashRegulatoryStatusFindingType,

    verdict:
      finding.verdict as
        FlashRegulatoryStatusVerdict,

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
export function parseFlashRegulatoryStatusSemanticOutput(
  raw:
    string,
): FlashRegulatoryStatusSemanticOutput {
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
        'regulatoryContextRelevant',
        'findings',
      ],
    ) ||
    typeof root.regulatoryContextRelevant !==
      'boolean' ||
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
    regulatoryContextRelevant:
      root.regulatoryContextRelevant,

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
 * Transformă outputul semantic în contractul
 * evaluatorului runtime Regulatory Status.
 *
 * Nu:
 * - inferă status regulator din keywords;
 * - verifică juridic afirmația;
 * - transformă "clear" în PASS fără evidence;
 * - decide AUTO / REVIEW / BLOCK.
 */
export function toFlashRegulatoryStatusEvidenceInput({
  document,
  output,
}: {
  document:
    FlashSemanticDocument

  output:
    FlashRegulatoryStatusSemanticOutput
}): FlashRegulatoryStatusEvidenceInput {
  return {
    regulatoryContextRelevant:
      output.regulatoryContextRelevant,

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
            resolveEvidenceRef({
              document,

              evidenceText:
                finding.evidenceText,
            }),
        }),
      ),
  }
}
