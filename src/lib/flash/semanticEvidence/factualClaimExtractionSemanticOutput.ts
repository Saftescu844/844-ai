import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export type FlashFactualClaimSourceField =
  | 'title'
  | 'excerpt'
  | 'body'

export interface FlashFactualClaimExtractionItemOutput {
  /**
   * Câmpul editorial din care modelul spune că
   * provine fragmentul.
   *
   * Modelul NU furnizează claimId.
   */
  sourceField:
    FlashFactualClaimSourceField

  /**
   * Fragment exact din documentul Flash.
   *
   * Validarea existenței lui în document este făcută
   * separat, deterministic.
   */
  evidenceText:
    string
}

export interface FlashFactualClaimExtractionSemanticOutput {
  claims:
    FlashFactualClaimExtractionItemOutput[]
}

const FACTUAL_CLAIM_SOURCE_FIELDS =
  new Set<
    FlashFactualClaimSourceField
  >([
    'title',
    'excerpt',
    'body',
  ])

type UnknownRecord =
  Record<
    string,
    unknown
  >

function invalidOutput():
  never {
  throw new FlashSemanticEvidenceProducerError(
    'invalid_output',
  )
}

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    value ===
      null ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    return null
  }

  return value as
    UnknownRecord
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
    .keys(
      record,
    )
    .every(
      key =>
        allowed.has(
          key,
        ),
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

function parseClaim(
  value:
    unknown,
):
  FlashFactualClaimExtractionItemOutput {
  const claim =
    asRecord(
      value,
    )

  if (!claim) {
    invalidOutput()
  }

  if (
    !hasOnlyKeys(
      claim,
      [
        'sourceField',
        'evidenceText',
      ],
    )
  ) {
    invalidOutput()
  }

  if (
    typeof claim.sourceField !==
      'string' ||
    !FACTUAL_CLAIM_SOURCE_FIELDS.has(
      claim.sourceField as
        FlashFactualClaimSourceField,
    )
  ) {
    invalidOutput()
  }

  return {
    sourceField:
      claim.sourceField as
        FlashFactualClaimSourceField,

    evidenceText:
      cleanRequiredString(
        claim.evidenceText,
      ),
  }
}

/**
 * Parser strict pentru claim extraction.
 *
 * Acceptă numai:
 *
 * {
 *   "claims": [
 *     {
 *       "sourceField": "title|excerpt|body",
 *       "evidenceText": "fragment exact"
 *     }
 *   ]
 * }
 *
 * Nu:
 * - repară JSON;
 * - elimină code fences;
 * - acceptă câmpuri suplimentare;
 * - acceptă claimId/citationId/chunkId/evidenceRef;
 * - produce verdict factual.
 */
export function parseFlashFactualClaimExtractionSemanticOutput(
  raw:
    string,
):
  FlashFactualClaimExtractionSemanticOutput {
  let parsed:
    unknown

  try {
    parsed =
      JSON.parse(
        raw,
      )
  } catch {
    invalidOutput()
  }

  const root =
    asRecord(
      parsed,
    )

  if (
    !root ||
    !hasOnlyKeys(
      root,
      [
        'claims',
      ],
    ) ||
    !Array.isArray(
      root.claims,
    )
  ) {
    invalidOutput()
  }

  const claims =
    root.claims.map(
      parseClaim,
    )

  const identities =
    claims.map(
      claim =>
        [
          claim.sourceField,
          claim.evidenceText,
        ].join(
          '\0',
        ),
    )

  if (
    new Set(
      identities,
    ).size !==
    identities.length
  ) {
    invalidOutput()
  }

  return {
    claims,
  }
}
