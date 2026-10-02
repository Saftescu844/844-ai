import {
  createHash,
} from 'node:crypto'

import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

const SOURCE_FINGERPRINT_NAMESPACE =
  'flash-source:v1'

export interface FlashArticleCandidateFingerprints {
  sourceFingerprint: string
  eventFingerprint: null
  eventFingerprintStatus: 'pending'
}

export function buildFlashArticleCandidateFingerprints(
  candidate:
    FlashNormalizedArticleCandidate,
): FlashArticleCandidateFingerprints {
  const canonicalUrl =
    candidate.canonicalUrl
      .trim()

  if (!canonicalUrl) {
    throw new Error(
      'Flash source fingerprint requires a canonical URL.',
    )
  }

  const sourceFingerprint =
    createHash(
      'sha256',
    )
      .update(
        `${SOURCE_FINGERPRINT_NAMESPACE}|${canonicalUrl}`,
        'utf8',
      )
      .digest(
        'hex',
      )

  return {
    sourceFingerprint,
    eventFingerprint:
      null,
    eventFingerprintStatus:
      'pending',
  }
}
