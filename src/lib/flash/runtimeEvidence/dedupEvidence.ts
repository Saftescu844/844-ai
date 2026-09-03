export type DedupRecordID = number | string

export type FlashDedupLanguage = 'ro' | 'en'

export type DedupReason =
  | 'missing_event_fingerprint'
  | 'event_fingerprint_match'
  | 'source_fingerprint_match'
  | 'normalized_title_match'

export interface FlashDedupRecord {
  id?: DedupRecordID | null
  language?: FlashDedupLanguage | null
  title: string
  eventFingerprint?: string | null
  sourceFingerprint?: string | null
}

export interface FlashDedupEvaluationInput {
  candidate: FlashDedupRecord
  existing: FlashDedupRecord[]

  /**
   * Documente care aparțin legitim aceluiași eveniment,
   * de exemplu perechea RO/EN.
   */
  ignoreExistingIds?: DedupRecordID[]
}

export interface FlashDedupMatch {
  id?: DedupRecordID | null
  reasons: Exclude<
    DedupReason,
    'missing_event_fingerprint'
  >[]
}

export interface FlashDedupEvidence {
  dedupPassed: boolean
  obviousDuplicate: boolean
  reasons: DedupReason[]
  matches: FlashDedupMatch[]
}

function normalizeFingerprint(
  value: string | null | undefined,
): string | null {
  const normalized = value
    ?.trim()
    .toLowerCase()

  return normalized
    ? normalized
    : null
}

export function normalizeDedupTitle(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function sameID(
  left: DedupRecordID | null | undefined,
  right: DedupRecordID | null | undefined,
): boolean {
  return (
    left !== null &&
    left !== undefined &&
    right !== null &&
    right !== undefined &&
    String(left) === String(right)
  )
}

export function evaluateFlashDedup(
  input: FlashDedupEvaluationInput,
): FlashDedupEvidence {
  const {
    candidate,
    existing,
    ignoreExistingIds = [],
  } = input

  const candidateEventFingerprint =
    normalizeFingerprint(
      candidate.eventFingerprint,
    )

  const candidateSourceFingerprint =
    normalizeFingerprint(
      candidate.sourceFingerprint,
    )

  const candidateTitle =
    normalizeDedupTitle(candidate.title)

  const ignoredIDs =
    new Set(
      ignoreExistingIds.map(String),
    )

  const matches: FlashDedupMatch[] = []

  let eventFingerprintMatch = false

  for (const record of existing) {
    if (sameID(candidate.id, record.id)) {
      continue
    }

    if (
      record.id !== null &&
      record.id !== undefined &&
      ignoredIDs.has(String(record.id))
    ) {
      continue
    }

    const matchReasons:
      FlashDedupMatch['reasons'] = []

    const existingEventFingerprint =
      normalizeFingerprint(
        record.eventFingerprint,
      )

    const existingSourceFingerprint =
      normalizeFingerprint(
        record.sourceFingerprint,
      )

    if (
      candidateEventFingerprint &&
      existingEventFingerprint &&
      candidateEventFingerprint ===
        existingEventFingerprint
    ) {
      matchReasons.push(
        'event_fingerprint_match',
      )

      eventFingerprintMatch = true
    }

    if (
      candidateSourceFingerprint &&
      existingSourceFingerprint &&
      candidateSourceFingerprint ===
        existingSourceFingerprint
    ) {
      matchReasons.push(
        'source_fingerprint_match',
      )
    }

    const sameLanguage =
      candidate.language !== null &&
      candidate.language !== undefined &&
      record.language !== null &&
      record.language !== undefined &&
      candidate.language === record.language

    if (
      sameLanguage &&
      candidateTitle &&
      candidateTitle ===
        normalizeDedupTitle(record.title)
    ) {
      matchReasons.push(
        'normalized_title_match',
      )
    }

    if (matchReasons.length > 0) {
      matches.push({
        id: record.id,
        reasons: matchReasons,
      })
    }
  }

  const reasons =
    new Set<DedupReason>()

  if (!candidateEventFingerprint) {
    reasons.add(
      'missing_event_fingerprint',
    )
  }

  for (const match of matches) {
    for (const reason of match.reasons) {
      reasons.add(reason)
    }
  }

  return {
    dedupPassed:
      reasons.size === 0,
    obviousDuplicate:
      eventFingerprintMatch,
    reasons: [...reasons],
    matches,
  }
}
