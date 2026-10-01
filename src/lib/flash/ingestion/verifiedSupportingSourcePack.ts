import {
  evaluateFlashSourceVerification,
  type FlashSourceVerificationCandidate,
  type FlashSourceVerificationEvidence,
} from '../runtimeEvidence/sourceVerificationEvidence'

export const FLASH_MIN_SUPPORTING_SOURCES =
  1

export const FLASH_MAX_SUPPORTING_SOURCES =
  2

export type FlashVerifiedSupportingSourcePackReason =
  | 'supporting_source_required'
  | 'too_many_supporting_sources'
  | 'primary_url_reused'
  | 'duplicate_supporting_url'
  | 'source_verification_failed'
  | 'supporting_text_unavailable'

export interface FlashSupportingSourcePackCandidate
  extends FlashSourceVerificationCandidate {
  textContent: string | null
}

export interface FlashVerifiedSupportingSource {
  id: string
  registeredSourceUrl: string
  concreteUrl: string
  finalUrl: string | null
  textContent: string
}

export interface FlashVerifiedSupportingSourcePackResult {
  acceptableForSemanticUse: boolean
  sources: FlashVerifiedSupportingSource[]
  verification: FlashSourceVerificationEvidence
  reasons: FlashVerifiedSupportingSourcePackReason[]
}

function comparableUrl(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null
  }

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

    url.hash = ''

    if (
      url.pathname.length > 1 &&
      url.pathname.endsWith('/')
    ) {
      url.pathname =
        url.pathname.slice(
          0,
          -1,
        )
    }

    return url.toString()
  } catch {
    return null
  }
}

/**
 * REG-001U deterministic gate for a small, explicitly supplied supporting
 * source pack.
 *
 * The helper intentionally does not discover sources, retrieve URLs, judge
 * factual truth, call a model, mutate persistence readiness, or write to
 * Payload. It only accepts one or two already-retrieved supporting documents
 * when every document passes the canonical technical source verification,
 * contains usable text, is distinct from the primary source, and is distinct
 * from the other supporting documents.
 *
 * When the pack is not acceptable, `sources` is deliberately empty so
 * downstream semantic stages cannot accidentally consume partially verified
 * supporting material.
 */
export function evaluateFlashVerifiedSupportingSourcePack({
  primaryCanonicalUrl,
  supportingSources,
}: {
  primaryCanonicalUrl: string
  supportingSources: FlashSupportingSourcePackCandidate[]
}): FlashVerifiedSupportingSourcePackResult {
  const verification =
    evaluateFlashSourceVerification(
      supportingSources,
    )

  const reasons =
    new Set<FlashVerifiedSupportingSourcePackReason>()

  if (
    supportingSources.length <
    FLASH_MIN_SUPPORTING_SOURCES
  ) {
    reasons.add(
      'supporting_source_required',
    )
  }

  if (
    supportingSources.length >
    FLASH_MAX_SUPPORTING_SOURCES
  ) {
    reasons.add(
      'too_many_supporting_sources',
    )
  }

  if (
    supportingSources.length > 0 &&
    !verification.sourceVerificationPassed
  ) {
    reasons.add(
      'source_verification_failed',
    )
  }

  const primaryComparableUrl =
    comparableUrl(
      primaryCanonicalUrl,
    )

  const seenSupportingUrls =
    new Set<string>()

  const normalizedSources:
    FlashVerifiedSupportingSource[] = []

  supportingSources.forEach(
    (source, index) => {
      const evaluated =
        verification.evaluatedSources[
          index
        ]

      const finalComparableUrl =
        comparableUrl(
          source.finalUrl,
        )

      const concreteComparableUrl =
        comparableUrl(
          source.concreteUrl,
        )

      const resolvedComparableUrl =
        finalComparableUrl ??
        concreteComparableUrl

      if (
        primaryComparableUrl &&
        (
          concreteComparableUrl ===
            primaryComparableUrl ||
          finalComparableUrl ===
            primaryComparableUrl
        )
      ) {
        reasons.add(
          'primary_url_reused',
        )
      }

      if (resolvedComparableUrl) {
        if (
          seenSupportingUrls.has(
            resolvedComparableUrl,
          )
        ) {
          reasons.add(
            'duplicate_supporting_url',
          )
        }

        seenSupportingUrls.add(
          resolvedComparableUrl,
        )
      }

      const textContent =
        source.textContent
          ?.trim() ??
        ''

      if (!textContent) {
        reasons.add(
          'supporting_text_unavailable',
        )
      }

      if (
        evaluated?.verified &&
        textContent
      ) {
        normalizedSources.push({
          id:
            source.id,
          registeredSourceUrl:
            source.registeredSourceUrl,
          concreteUrl:
            source.concreteUrl,
          finalUrl:
            source.finalUrl ??
            null,
          textContent,
        })
      }
    },
  )

  const acceptableForSemanticUse =
    reasons.size === 0 &&
    normalizedSources.length ===
      supportingSources.length

  return {
    acceptableForSemanticUse,
    sources:
      acceptableForSemanticUse
        ? normalizedSources
        : [],
    verification,
    reasons: [
      ...reasons,
    ],
  }
}
