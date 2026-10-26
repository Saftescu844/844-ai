/** Automatic RSS uses a rolling UTC window; manual editorial preparation is separate. */
export const FLASH_RSS_MAX_AGE_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
export type FlashPublicationFreshnessReason = 'missing_date' | 'invalid_date' | 'future_date' | 'too_old'
export type FlashPublicationFreshness = { eligible: true } | { eligible: false; reason: FlashPublicationFreshnessReason }

export function parseFlashRssMaxAgeDays(value?: string | null): number {
  if (value == null) return FLASH_RSS_MAX_AGE_DAYS
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > FLASH_RSS_MAX_AGE_DAYS) {
    throw new Error('RSS --max-age-days must be an integer from 1 to 30.')
  }
  return Number(value)
}

/** Explicit ISO/UTC calendar dates or RFC 822 RSS dates only; never local-time parsing or rollover. */
export function flashPublicationTimestamp(value: string | null | undefined): number | null {
  const text = value?.trim()
  if (!text) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2}))?$/.exec(text)
  const rss = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(GMT|UTC|Z|[+-]\d{4})$/i.exec(text)
  if (!iso && !rss) return null
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const year = Number(iso ? iso[1] : rss![3])
  const month = iso ? Number(iso[2]) : months.indexOf(rss![2].toLowerCase()) + 1
  const day = Number(iso ? iso[3] : rss![1])
  const hour = Number((iso ? iso[4] : rss![4]) ?? 0)
  const minute = Number((iso ? iso[5] : rss![5]) ?? 0)
  const second = Number((iso ? iso[6] : rss![6]) ?? 0)
  const zone = (iso ? iso[7] : rss![7]) ?? 'Z'
  const offset = /^[+-](\d{2}):?(\d{2})$/.exec(zone)
  if (year < 1000 || month < 1 || month > 12 || day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
      hour > 23 || minute > 59 || second > 59 ||
      (offset && (Number(offset[1]) > 23 || Number(offset[2]) > 59))) return null
  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function assessFlashPublicationFreshness(
  publishedAt: string | null | undefined,
  { now, maxAgeDays = FLASH_RSS_MAX_AGE_DAYS }: { now: number; maxAgeDays?: number },
): FlashPublicationFreshness {
  if (!Number.isFinite(now) || !Number.isInteger(maxAgeDays) || maxAgeDays < 1 || maxAgeDays > FLASH_RSS_MAX_AGE_DAYS) {
    throw new Error('Invalid RSS freshness policy or reference time.')
  }
  if (!publishedAt?.trim()) return { eligible: false, reason: 'missing_date' }
  const timestamp = flashPublicationTimestamp(publishedAt)
  if (timestamp === null) return { eligible: false, reason: 'invalid_date' }
  if (timestamp > now) return { eligible: false, reason: 'future_date' }
  if (now - timestamp > maxAgeDays * DAY_MS) return { eligible: false, reason: 'too_old' }
  return { eligible: true }
}

/** Filters before source scan limits and attempt allocation; never changes the source date or skip memory. */
export function filterFlashRssFreshCandidates<T extends { publishedAt: string | null; publicationDateInvalid?: boolean }>(
  candidates: T[], policy: { now: number; maxAgeDays?: number },
) {
  const rejected: Record<FlashPublicationFreshnessReason, number> = {
    missing_date: 0, invalid_date: 0, future_date: 0, too_old: 0,
  }
  const eligible = candidates.filter(candidate => {
    const assessment: FlashPublicationFreshness = candidate.publicationDateInvalid
      ? { eligible: false, reason: 'invalid_date' }
      : assessFlashPublicationFreshness(candidate.publishedAt, policy)
    if (assessment.eligible) return true
    rejected[assessment.reason] += 1
    return false
  })
  return { candidates: eligible, filteredCount: candidates.length - eligible.length, rejected }
}
