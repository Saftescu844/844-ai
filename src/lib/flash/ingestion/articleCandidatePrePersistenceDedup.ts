import type {
  DedupRecordID,
  FlashDedupLanguage,
} from '../runtimeEvidence/dedupEvidence'
import {
  normalizeDedupTitle,
} from '../runtimeEvidence/dedupEvidence'
import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

export type FlashPrePersistenceDedupMatchReason =
  | 'canonical_source_url_match'
  | 'event_fingerprint_match'
  | 'source_fingerprint_match'
  | 'normalized_title_match'

export type FlashPrePersistenceDedupReason =
  | FlashPrePersistenceDedupMatchReason
  | 'missing_event_fingerprint'

export interface FlashPrePersistenceDedupRecord {
  id?: DedupRecordID | null
  language?: FlashDedupLanguage | null
  title: string
  eventFingerprint?: string | null
  sourceFingerprint?: string | null
  sourceUrls?: Array<
    string | null | undefined
  >
}

export interface FlashPrePersistenceDedupCandidateSignals {
  eventFingerprint?: string | null
  sourceFingerprint?: string | null
}

export interface FlashPrePersistenceDedupMatch {
  id?: DedupRecordID | null
  reasons:
    FlashPrePersistenceDedupMatchReason[]
}

export interface FlashPrePersistenceDedupEvidence {
  candidateCanonicalUrl: string
  sourceDuplicateFound: boolean
  eventFingerprintDuplicateFound: boolean
  sourceFingerprintReviewSignal: boolean
  titleReviewSignal: boolean
  finalDedupPending: boolean
  reasons:
    FlashPrePersistenceDedupReason[]
  matches:
    FlashPrePersistenceDedupMatch[]
}

function canonicalizeHttpUrl(
  value: string,
): string | null {
  try {
    const url =
      new URL(
        value.trim(),
      )

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      return null
    }

    if (!url.hostname) {
      return null
    }

    url.search = ''
    url.hash = ''

    return url.toString()
  } catch {
    return null
  }
}

function normalizeFingerprint(
  value: string | null | undefined,
): string | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase()

  return normalized
    ? normalized
    : null
}

export function evaluateFlashArticlePrePersistenceDedup(
  candidate:
    FlashNormalizedArticleCandidate,
  existing:
    FlashPrePersistenceDedupRecord[],
  candidateSignals:
    FlashPrePersistenceDedupCandidateSignals = {},
): FlashPrePersistenceDedupEvidence {
  const candidateCanonicalUrl =
    canonicalizeHttpUrl(
      candidate.canonicalUrl,
    )

  if (!candidateCanonicalUrl) {
    throw new Error(
      'Flash pre-persistence dedup candidate canonical URL is invalid.',
    )
  }

  const candidateEventFingerprint =
    normalizeFingerprint(
      candidateSignals.eventFingerprint,
    )

  const candidateSourceFingerprint =
    normalizeFingerprint(
      candidateSignals.sourceFingerprint,
    )

  const candidateTitle =
    normalizeDedupTitle(
      candidate.title,
    )

  const matches:
    FlashPrePersistenceDedupMatch[] = []

  let sourceDuplicateFound = false
  let eventFingerprintDuplicateFound = false
  let sourceFingerprintReviewSignal = false
  let titleReviewSignal = false

  for (const record of existing) {
    const matchReasons:
      FlashPrePersistenceDedupMatchReason[] = []

    const sourceUrlMatch =
      (record.sourceUrls ?? [])
        .some(
          value => {
            if (!value) {
              return false
            }

            return (
              canonicalizeHttpUrl(
                value,
              ) ===
              candidateCanonicalUrl
            )
          },
        )

    if (sourceUrlMatch) {
      sourceDuplicateFound = true
      matchReasons.push(
        'canonical_source_url_match',
      )
    }

    const existingEventFingerprint =
      normalizeFingerprint(
        record.eventFingerprint,
      )

    if (
      candidateEventFingerprint &&
      existingEventFingerprint &&
      candidateEventFingerprint ===
        existingEventFingerprint
    ) {
      eventFingerprintDuplicateFound = true
      matchReasons.push(
        'event_fingerprint_match',
      )
    }

    const existingSourceFingerprint =
      normalizeFingerprint(
        record.sourceFingerprint,
      )

    if (
      candidateSourceFingerprint &&
      existingSourceFingerprint &&
      candidateSourceFingerprint ===
        existingSourceFingerprint
    ) {
      sourceFingerprintReviewSignal = true
      matchReasons.push(
        'source_fingerprint_match',
      )
    }

    const sameLanguage =
      record.language !== null &&
      record.language !== undefined &&
      record.language ===
        candidate.language

    if (
      sameLanguage &&
      candidateTitle &&
      candidateTitle ===
        normalizeDedupTitle(
          record.title,
        )
    ) {
      titleReviewSignal = true
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
    new Set<
      FlashPrePersistenceDedupReason
    >()

  if (!candidateEventFingerprint) {
    reasons.add(
      'missing_event_fingerprint',
    )
  }

  for (const match of matches) {
    for (const reason of match.reasons) {
      reasons.add(
        reason,
      )
    }
  }

  return {
    candidateCanonicalUrl,
    sourceDuplicateFound,
    eventFingerprintDuplicateFound,
    sourceFingerprintReviewSignal,
    titleReviewSignal,
    finalDedupPending:
      candidateEventFingerprint === null,
    reasons: [
      ...reasons,
    ],
    matches,
  }
}
