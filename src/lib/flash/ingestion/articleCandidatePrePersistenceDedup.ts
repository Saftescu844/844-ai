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
  | 'normalized_title_match'

export type FlashPrePersistenceDedupReason =
  | FlashPrePersistenceDedupMatchReason
  | 'missing_event_fingerprint'

export interface FlashPrePersistenceDedupRecord {
  id?: DedupRecordID | null
  language?: FlashDedupLanguage | null
  title: string
  sourceUrls?: Array<
    string | null | undefined
  >
}

export interface FlashPrePersistenceDedupMatch {
  id?: DedupRecordID | null
  reasons:
    FlashPrePersistenceDedupMatchReason[]
}

export interface FlashPrePersistenceDedupEvidence {
  candidateCanonicalUrl: string
  sourceDuplicateFound: boolean
  titleReviewSignal: boolean
  finalDedupPending: true
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

export function evaluateFlashArticlePrePersistenceDedup(
  candidate:
    FlashNormalizedArticleCandidate,
  existing:
    FlashPrePersistenceDedupRecord[],
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

  const candidateTitle =
    normalizeDedupTitle(
      candidate.title,
    )

  const matches:
    FlashPrePersistenceDedupMatch[] = []

  let sourceDuplicateFound = false
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
    >([
      'missing_event_fingerprint',
    ])

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
    titleReviewSignal,
    finalDedupPending: true,
    reasons: [
      ...reasons,
    ],
    matches,
  }
}
