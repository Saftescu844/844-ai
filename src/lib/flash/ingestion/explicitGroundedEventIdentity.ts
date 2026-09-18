import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'
import type {
  FlashGroundedEventIdentity,
} from './groundedEventFingerprint'

export type FlashExplicitEventIdentitySourceField =
  | 'title'
  | 'lead'
  | 'body'

export type FlashExplicitEventIdentityAuthority =
  | 'cve'
  | 'doi'
  | 'eur-lex-celex'

export interface FlashExplicitEventIdentityCandidate {
  authority:
    FlashExplicitEventIdentityAuthority
  stableId: string
  sourceField:
    FlashExplicitEventIdentitySourceField
  evidenceText: string
}

export type FlashExplicitEventIdentityStatus =
  | 'grounded'
  | 'pending'
  | 'ambiguous'

export type FlashExplicitEventIdentityReason =
  | 'single_explicit_primary_identifier'
  | 'operator_confirmed_body_identifier'
  | 'no_explicit_identifier'
  | 'body_only_identifier'
  | 'multiple_explicit_primary_identifiers'

export interface FlashExplicitEventIdentityEvaluation {
  status:
    FlashExplicitEventIdentityStatus
  reason:
    FlashExplicitEventIdentityReason
  identity:
    FlashGroundedEventIdentity | null
  candidates:
    FlashExplicitEventIdentityCandidate[]
}

export interface FlashExplicitEventIdentityOptions {
  confirmedBodyIdentity?: {
    authority:
      FlashExplicitEventIdentityAuthority
    stableId: string
  }
}

function normalizeStableId(
  authority:
    FlashExplicitEventIdentityAuthority,
  stableId: string,
): string {
  const trimmed =
    stableId.trim()

  if (authority === 'cve') {
    return trimmed.toUpperCase()
  }

  if (authority === 'doi') {
    return trimmed.toLowerCase()
  }

  return trimmed.toUpperCase()
}

function pushUniqueCandidate(
  target:
    Map<
      string,
      FlashExplicitEventIdentityCandidate
    >,
  candidate:
    FlashExplicitEventIdentityCandidate,
): void {
  const key =
    `${candidate.authority}|${candidate.stableId}`

  if (!target.has(key)) {
    target.set(
      key,
      candidate,
    )
  }
}

function collectFromField(
  target:
    Map<
      string,
      FlashExplicitEventIdentityCandidate
    >,
  sourceField:
    FlashExplicitEventIdentitySourceField,
  text: string,
): void {
  for (const match of text.matchAll(
    /\bCVE-\d{4}-\d{4,7}\b/gi,
  )) {
    const evidenceText =
      match[0]

    pushUniqueCandidate(
      target,
      {
        authority:
          'cve',
        stableId:
          normalizeStableId(
            'cve',
            evidenceText,
          ),
        sourceField,
        evidenceText,
      },
    )
  }

  for (const match of text.matchAll(
    /\bdoi\s*:\s*(10\.\d{4,9}\/[^\s<>"']+)/gi,
  )) {
    const evidenceText =
      match[0]
    const rawStableId =
      (match[1] ?? '')
        .replace(/[.,;:!?)}\]]+$/g, '')

    if (!rawStableId) {
      continue
    }

    pushUniqueCandidate(
      target,
      {
        authority:
          'doi',
        stableId:
          normalizeStableId(
            'doi',
            rawStableId,
          ),
        sourceField,
        evidenceText,
      },
    )
  }

  for (const match of text.matchAll(
    /\bCELEX\s*:\s*([0-9A-Z]{8,20})\b/gi,
  )) {
    const evidenceText =
      match[0]
    const rawStableId =
      match[1] ?? ''

    if (!rawStableId) {
      continue
    }

    pushUniqueCandidate(
      target,
      {
        authority:
          'eur-lex-celex',
        stableId:
          normalizeStableId(
            'eur-lex-celex',
            rawStableId,
          ),
        sourceField,
        evidenceText,
      },
    )
  }
}

/**
 * Extrage numai identificatori expliciți și verificabili
 * textual din candidatul normalizat.
 *
 * Regula de siguranță:
 * - un singur identificator unic din title/lead poate
 *   deveni identitate grounded;
 * - body-only rămâne pending deoarece poate fi o referință
 *   secundară / de context;
 * - mai mulți identificatori primari diferiți => ambiguous;
 * - în lipsa unui identificator explicit => pending.
 *
 * Deliberat NU construiește identitate din titlu + dată,
 * similaritate, embeddings sau model output neverificat.
 */
export function evaluateExplicitGroundedEventIdentity(
  candidate:
    FlashNormalizedArticleCandidate,
  options:
    FlashExplicitEventIdentityOptions = {},
): FlashExplicitEventIdentityEvaluation {
  const collected =
    new Map<
      string,
      FlashExplicitEventIdentityCandidate
    >()

  collectFromField(
    collected,
    'title',
    candidate.title,
  )

  collectFromField(
    collected,
    'lead',
    candidate.lead,
  )

  collectFromField(
    collected,
    'body',
    candidate.bodyText,
  )

  const candidates =
    [...collected.values()]

  const primaryCandidates =
    candidates.filter(
      item =>
        item.sourceField === 'title' ||
        item.sourceField === 'lead',
    )

  if (primaryCandidates.length === 1) {
    const [primary] =
      primaryCandidates

    return {
      status:
        'grounded',
      reason:
        'single_explicit_primary_identifier',
      identity: {
        authority:
          primary.authority,
        stableId:
          primary.stableId,
      },
      candidates,
    }
  }

  if (primaryCandidates.length > 1) {
    return {
      status:
        'ambiguous',
      reason:
        'multiple_explicit_primary_identifiers',
      identity:
        null,
      candidates,
    }
  }

  if (options.confirmedBodyIdentity) {
    if (
      candidates.length !==
      1
    ) {
      throw new Error(
        'Flash explicit event identity confirmation requires exactly one body-only identifier.',
      )
    }

    const [bodyCandidate] =
      candidates

    if (
      bodyCandidate.sourceField !==
      'body'
    ) {
      throw new Error(
        'Flash explicit event identity confirmation requires exactly one body-only identifier.',
      )
    }

    const confirmedAuthority =
      options.confirmedBodyIdentity
        .authority

    const confirmedStableId =
      normalizeStableId(
        confirmedAuthority,
        options.confirmedBodyIdentity
          .stableId,
      )

    if (
      confirmedAuthority !==
        bodyCandidate.authority ||
      confirmedStableId !==
        bodyCandidate.stableId
    ) {
      throw new Error(
        'Flash explicit event identity confirmation does not match the unique body-only identifier.',
      )
    }

    return {
      status:
        'grounded',
      reason:
        'operator_confirmed_body_identifier',
      identity: {
        authority:
          bodyCandidate.authority,
        stableId:
          bodyCandidate.stableId,
      },
      candidates,
    }
  }

  if (candidates.length > 0) {
    return {
      status:
        'pending',
      reason:
        'body_only_identifier',
      identity:
        null,
      candidates,
    }
  }

  return {
    status:
      'pending',
    reason:
      'no_explicit_identifier',
    identity:
      null,
    candidates:
      [],
  }
}
