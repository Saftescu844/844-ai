export type FlashRssCandidateSkipReason =
  | 'event_identity_not_grounded'
  | 'strong_duplicate'

export interface FlashRssCandidateSkipMemoryEntry {
  url: string
  reason: FlashRssCandidateSkipReason
  skippedAt: string
}

export const FLASH_RSS_CANDIDATE_SKIP_MEMORY_TTL_MS =
  7 * 24 * 60 * 60 * 1000

export const FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT =
  100

export function canonicalFlashRssCandidateUrl(
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

function parsedEntry(
  value: unknown,
): FlashRssCandidateSkipMemoryEntry | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  const record =
    value as Record<string, unknown>

  const url =
    typeof record.url === 'string'
      ? canonicalFlashRssCandidateUrl(
          record.url,
        )
      : null

  const reason =
    record.reason

  const skippedAt =
    typeof record.skippedAt === 'string'
      ? record.skippedAt
      : null

  if (
    !url ||
    (
      reason !== 'event_identity_not_grounded' &&
      reason !== 'strong_duplicate'
    ) ||
    !skippedAt ||
    Number.isNaN(
      Date.parse(
        skippedAt,
      ),
    )
  ) {
    return null
  }

  return {
    url,
    reason,
    skippedAt:
      new Date(
        skippedAt,
      ).toISOString(),
  }
}

function activeEntries(
  value: unknown,
  nowMs: number,
): FlashRssCandidateSkipMemoryEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const cutoff =
    nowMs -
    FLASH_RSS_CANDIDATE_SKIP_MEMORY_TTL_MS

  return value
    .map(
      parsedEntry,
    )
    .filter(
      (
        entry,
      ): entry is FlashRssCandidateSkipMemoryEntry =>
        entry !== null &&
        Date.parse(
          entry.skippedAt,
        ) >= cutoff,
    )
    .slice(
      0,
      FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT,
    )
}

export function activeFlashRssCandidateSkipUrls(
  value: unknown,
  nowMs = Date.now(),
): Set<string> {
  return new Set(
    activeEntries(
      value,
      nowMs,
    ).map(
      entry =>
        entry.url,
    ),
  )
}

export function rememberFlashRssCandidateSkip({
  value,
  url,
  reason,
  skippedAt = new Date().toISOString(),
}: {
  value: unknown
  url: string
  reason: FlashRssCandidateSkipReason
  skippedAt?: string
}): FlashRssCandidateSkipMemoryEntry[] {
  const canonicalUrl =
    canonicalFlashRssCandidateUrl(
      url,
    )

  const skippedAtMs =
    Date.parse(
      skippedAt,
    )

  if (!canonicalUrl) {
    throw new Error(
      'Cannot remember an invalid Flash RSS candidate URL.',
    )
  }

  if (
    Number.isNaN(
      skippedAtMs,
    )
  ) {
    throw new Error(
      'Cannot remember a Flash RSS candidate with an invalid skippedAt timestamp.',
    )
  }

  const current =
    activeEntries(
      value,
      skippedAtMs,
    ).filter(
      entry =>
        entry.url !==
          canonicalUrl,
    )

  return [
    {
      url:
        canonicalUrl,
      reason,
      skippedAt:
        new Date(
          skippedAtMs,
        ).toISOString(),
    },
    ...current,
  ].slice(
    0,
    FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT,
  )
}
