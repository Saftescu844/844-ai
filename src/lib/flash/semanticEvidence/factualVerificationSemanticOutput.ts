import type {
  CitationCheckVerdict,
} from '../runtimeEvidence/factualSupportProvenance'

import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export interface FlashFactualVerificationSemanticCheckOutput {
  /**
   * Identitate creată anterior de cod.
   *
   * Modelul doar selectează un chunk existent.
   */
  chunkId:
    string

  /**
   * Împreună cu chunkId identifică fără ambiguitate
   * apariția concretă a chunk-ului.
   *
   * Modelul nu creează indexul; îl selectează dintre
   * valorile furnizate.
   */
  chunkIndex:
    number

  verdict:
    CitationCheckVerdict
}

export interface FlashFactualVerificationSemanticClaimOutput {
  /**
   * Claim ID creat anterior de cod.
   *
   * Modelul nu îl generează.
   */
  claimId:
    string

  checks:
    FlashFactualVerificationSemanticCheckOutput[]
}

export interface FlashFactualVerificationSemanticOutput {
  claims:
    FlashFactualVerificationSemanticClaimOutput[]
}

const CITATION_CHECK_VERDICTS =
  new Set<
    CitationCheckVerdict
  >([
    'supports',
    'partiallySupports',
    'contradicts',
    'notFound',
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

function checkIdentity({
  chunkId,
  chunkIndex,
}: {
  chunkId:
    string

  chunkIndex:
    number
}): string {
  return [
    chunkId,
    String(
      chunkIndex,
    ),
  ].join(
    '\0',
  )
}

function parseCheck(
  value:
    unknown,
):
  FlashFactualVerificationSemanticCheckOutput {
  const check =
    asRecord(
      value,
    )

  if (
    !check ||
    !hasOnlyKeys(
      check,
      [
        'chunkId',
        'chunkIndex',
        'verdict',
      ],
    )
  ) {
    invalidOutput()
  }

  const chunkId =
    cleanRequiredString(
      check.chunkId,
    )

  if (
    !Number.isInteger(
      check.chunkIndex,
    ) ||
    (
      check.chunkIndex as number
    ) < 0
  ) {
    invalidOutput()
  }

  if (
    typeof check.verdict !==
      'string' ||
    !CITATION_CHECK_VERDICTS.has(
      check.verdict as
        CitationCheckVerdict,
    )
  ) {
    invalidOutput()
  }

  return {
    chunkId,

    chunkIndex:
      check.chunkIndex as
        number,

    verdict:
      check.verdict as
        CitationCheckVerdict,
  }
}

function parseClaim(
  value:
    unknown,
):
  FlashFactualVerificationSemanticClaimOutput {
  const claim =
    asRecord(
      value,
    )

  if (
    !claim ||
    !hasOnlyKeys(
      claim,
      [
        'claimId',
        'checks',
      ],
    ) ||
    !Array.isArray(
      claim.checks,
    )
  ) {
    invalidOutput()
  }

  const claimId =
    cleanRequiredString(
      claim.claimId,
    )

  const checks =
    claim.checks.map(
      parseCheck,
    )

  const identities =
    checks.map(
      check =>
        checkIdentity(
          check,
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
    claimId,
    checks,
  }
}

/**
 * Parser strict pentru factual verification.
 *
 * Modelul poate întoarce numai:
 *
 * {
 *   "claims": [
 *     {
 *       "claimId": "...",
 *       "checks": [
 *         {
 *           "chunkId": "...",
 *           "chunkIndex": 0,
 *           "verdict":
 *             "supports|partiallySupports|contradicts|notFound"
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Modelul NU furnizează:
 * - citationId;
 * - evidenceRef;
 * - supportStatus;
 * - generationRunId;
 * - verificationRunId;
 * - fabrication flags;
 * - decizie editorială.
 */
export function parseFlashFactualVerificationSemanticOutput(
  raw:
    string,
):
  FlashFactualVerificationSemanticOutput {
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

  const claimIds =
    claims.map(
      claim =>
        claim.claimId,
    )

  if (
    new Set(
      claimIds,
    ).size !==
    claimIds.length
  ) {
    invalidOutput()
  }

  return {
    claims,
  }
}
