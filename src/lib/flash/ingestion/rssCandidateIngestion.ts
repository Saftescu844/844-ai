import { assessInstitutionalHtmlSource } from './institutionalHtmlDiscovery'
import { flashPublicationTimestamp } from './flashPublicationFreshness'
import Parser from 'rss-parser'
import { microsoftResearchArticleUrl } from './microsoftResearchArticleAdapter'

import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

export type FlashRssIngestionBlocker =
  | 'invalid_feed_url'
  | 'invalid_source_url'
  | 'missing_feed_rss'
  | 'unsupported_html_discovery'

export interface FlashRssIngestionSourcePlan {
  sourceId: number
  sourceName: string
  registeredSourceUrl: string
  feedUrl: string | null
  discoveryMethod?: 'rss' | 'html'
  sourceRole:
    Surse['sourceRole']
  editorialTrust:
    Surse['editorialTrust']
  citationMode:
    Surse['citationMode']
  allowAutoPublish: boolean
  maxCandidatesPerScan: number
  maxCandidatesPerDay: number
  candidateSkipMemory:
    Surse['rssCandidateSkipMemory']
  ready: boolean
  blocker:
    FlashRssIngestionBlocker | null
}

export interface FlashRssCandidate {
  sourceId: number
  sourceName: string
  sourceRole:
    Surse['sourceRole']
  editorialTrust:
    Surse['editorialTrust']
  citationMode:
    Surse['citationMode']
  feedUrl: string
  title: string
  concreteUrl: string
  publishedAt: string | null
  /** Distinguishes malformed source dates from absent dates after normalization. */
  publicationDateInvalid?: true
  summary: string | null
}

export interface FlashRssCandidateParseResult {
  totalItems: number
  skippedItems: number
  candidates:
    FlashRssCandidate[]
}

type FlashRssIngestionPayload =
  Pick<
    Payload,
    'find'
  >

type FlashRssIngestionSourceRecord =
  Pick<
    Surse,
    | 'id'
    | 'nume'
    | 'url'
    | 'feedRSS'
    | 'sourceRole'
    | 'editorialTrust'
    | 'citationMode'
    | 'allowAutoPublish'
    | 'maxCandidatesPerScan'
    | 'maxCandidatesPerDay'
    | 'rssCandidateSkipMemory'
  >

type FlashRssDailyBudgetRecord =
  Pick<
    FlashAi,
    | 'createdAt'
    | 'generatAutomat'
    | 'surseFlash'
  >

interface FlashRssFeedItem {
  title?: string | null
  link?: string | null
  pubDate?: string | null
  isoDate?: string | null
  contentSnippet?: string | null
  content?: string | null
  summary?: string | null
}

export type FlashRssFeedParser =
  (
    xml: string,
  ) => Promise<{
    items?:
      FlashRssFeedItem[]
  }>

export interface ParseFlashRssCandidatesOptions {
  /** Runner must apply the source limit after eligibility filtering. */
  scanBeforeEligibility?: boolean
  maxItems?: number
  parseFeed?:
    FlashRssFeedParser
}

function normalizeHttpUrl(
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

    return url.hostname
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function normalizeOptionalText(
  value:
    string | null | undefined,
): string | null {
  const normalized =
    value
      ?.replace(
        /\s+/g,
        ' ',
      )
      .trim()

  return normalized
    ? normalized
    : null
}

function normalizePositiveInteger(
  value: number | null | undefined,
  fallback: number,
  maximum: number,
): number {
  return Number.isInteger(
    value,
  ) &&
    (value ?? 0) > 0
    ? Math.min(
        value ?? fallback,
        maximum,
      )
    : fallback
}

function relationID(
  relation:
    | number
    | { id: number }
    | null
    | undefined,
): number | null {
  if (
    typeof relation ===
    'number'
  ) {
    return relation
  }

  if (
    relation &&
    typeof relation ===
      'object' &&
    typeof relation.id ===
      'number'
  ) {
    return relation.id
  }

  return null
}

function normalizePublishedAt(
  value:
    string | null | undefined,
): string | null {
  const normalized =
    normalizeOptionalText(
      value,
    )

  if (!normalized) {
    return null
  }

  const timestamp = flashPublicationTimestamp(normalized)
  return timestamp === null ? null : new Date(timestamp).toISOString()
}

export function assessFlashRssIngestionSource(
  source:
    FlashRssIngestionSourceRecord,
): FlashRssIngestionSourcePlan {
  const maxCandidatesPerScan =
    normalizePositiveInteger(
      source.maxCandidatesPerScan,
      10,
      20,
    )

  const maxCandidatesPerDay =
    normalizePositiveInteger(
      source.maxCandidatesPerDay,
      40,
      500,
    )

  const registeredSourceUrl =
    normalizeHttpUrl(
      source.url,
    )

  if (!registeredSourceUrl) {
    return {
      sourceId:
        source.id,
      sourceName:
        source.nume,
      registeredSourceUrl:
        source.url,
      feedUrl:
        null,
      sourceRole:
        source.sourceRole,
      editorialTrust:
        source.editorialTrust,
      citationMode:
        source.citationMode,
      allowAutoPublish:
        source.allowAutoPublish ===
        true,
      maxCandidatesPerScan,
      maxCandidatesPerDay,
      candidateSkipMemory:
        source.rssCandidateSkipMemory ??
        [],
      ready:
        false,
      blocker:
        'invalid_source_url',
    }
  }

  const rawFeedUrl =
    source.feedRSS?.trim()

  if (!rawFeedUrl) {
    return {
      sourceId:
        source.id,
      sourceName:
        source.nume,
      registeredSourceUrl,
      feedUrl:
        null,
      sourceRole:
        source.sourceRole,
      editorialTrust:
        source.editorialTrust,
      citationMode:
        source.citationMode,
      allowAutoPublish:
        source.allowAutoPublish ===
        true,
      maxCandidatesPerScan,
      maxCandidatesPerDay,
      candidateSkipMemory:
        source.rssCandidateSkipMemory ??
        [],
      ready:
        false,
      blocker:
        'missing_feed_rss',
    }
  }

  const feedUrl =
    normalizeHttpUrl(
      rawFeedUrl,
    )

  if (!feedUrl) {
    return {
      sourceId:
        source.id,
      sourceName:
        source.nume,
      registeredSourceUrl,
      feedUrl:
        rawFeedUrl,
      sourceRole:
        source.sourceRole,
      editorialTrust:
        source.editorialTrust,
      citationMode:
        source.citationMode,
      allowAutoPublish:
        source.allowAutoPublish ===
        true,
      maxCandidatesPerScan,
      maxCandidatesPerDay,
      candidateSkipMemory:
        source.rssCandidateSkipMemory ??
        [],
      ready:
        false,
      blocker:
        'invalid_feed_url',
    }
  }

  return {
    sourceId:
      source.id,
    sourceName:
      source.nume,
    registeredSourceUrl,
    feedUrl,
    sourceRole:
      source.sourceRole,
    editorialTrust:
      source.editorialTrust,
    citationMode:
      source.citationMode,
    allowAutoPublish:
      source.allowAutoPublish ===
      true,
    maxCandidatesPerScan,
    maxCandidatesPerDay,
    candidateSkipMemory:
      source.rssCandidateSkipMemory ??
      [],
    ready:
      true,
    blocker:
      null,
  }
}

export function filterFlashRssCandidatesWithinDailySourceBudgets(
  candidates:
    FlashRssCandidate[],
  plans:
    FlashRssIngestionSourcePlan[],
  existing:
    FlashRssDailyBudgetRecord[],
  nowMs:
    number = Date.now(),
): {
  candidates: FlashRssCandidate[]
  filteredCount: number
} {
  const cutoffMs =
    nowMs -
    24 * 60 * 60 * 1_000

  const recentUrlsBySourceId =
    new Map<
      number,
      Set<string>
    >()

  for (
    const flash of
      existing
  ) {
    if (
      flash.generatAutomat !==
      true
    ) {
      continue
    }

    const createdAtMs =
      Date.parse(
        flash.createdAt,
      )

    if (
      Number.isNaN(
        createdAtMs,
      ) ||
      createdAtMs <
        cutoffMs ||
      createdAtMs >
        nowMs
    ) {
      continue
    }

    for (
      const source of
        flash.surseFlash ?? []
    ) {
      const sourceId =
        relationID(
          source.sursa,
        )

      const sourceUrl =
        normalizeHttpUrl(
          source.url,
        )

      if (
        sourceId === null ||
        !sourceUrl
      ) {
        continue
      }

      const urls =
        recentUrlsBySourceId.get(
          sourceId,
        ) ??
        new Set<string>()

      urls.add(
        sourceUrl,
      )

      recentUrlsBySourceId.set(
        sourceId,
        urls,
      )
    }
  }

  const planBySourceId =
    new Map(
      plans.map(
        plan => [
          plan.sourceId,
          plan,
        ] as const,
      ),
    )

  let filteredCount = 0

  const withinBudget =
    candidates.filter(
      candidate => {
        const plan =
          planBySourceId.get(
            candidate.sourceId,
          )

        if (!plan) {
          filteredCount += 1
          return false
        }

        const recentCount =
          recentUrlsBySourceId.get(
            candidate.sourceId,
          )?.size ?? 0

        if (
          recentCount >=
          plan.maxCandidatesPerDay
        ) {
          filteredCount += 1
          return false
        }

        return true
      },
    )

  return {
    candidates:
      withinBudget,
    filteredCount,
  }
}

/** Input must already be filtered and sorted newest first. No provider calls. */
export function limitFlashRssEligibleCandidates(
  candidates: FlashRssCandidate[],
  plans: FlashRssIngestionSourcePlan[],
  maxPerSource: number,
): { candidates: FlashRssCandidate[]; filteredCount: number } {
  const limits = new Map(plans.map(plan => [plan.sourceId,
    Math.min(plan.maxCandidatesPerScan, maxPerSource)]))
  const counts = new Map<number, number>()
  const selected = candidates.filter(candidate => {
    const count = counts.get(candidate.sourceId) ?? 0
    if (count >= (limits.get(candidate.sourceId) ?? 0)) return false
    counts.set(candidate.sourceId, count + 1)
    return true
  })
  return { candidates: selected, filteredCount: candidates.length - selected.length }
}

export async function planFlashRssIngestionSources(
  payload:
    FlashRssIngestionPayload,
  options: { includeHtml?: boolean } = {},
): Promise<
  FlashRssIngestionSourcePlan[]
> {
  const sources =
    await payload.find({
      collection:
        'surse',

      depth:
        0,

      overrideAccess:
        true,

      pagination:
        false,

      where: {
        and: [
          {
            activa: {
              equals:
                true,
            },
          },
          {
            allowIngestion: {
              equals:
                true,
            },
          },
        ],
      },
    })

  return sources.docs.map(
    source =>
      options.includeHtml && source.discoveryMethod === 'html'
        ? assessInstitutionalHtmlSource(source)
        : assessFlashRssIngestionSource(source),
  )
}

const defaultParseFeed:
  FlashRssFeedParser =
  async xml => {
    const parser =
      new Parser()

    const parsed =
      await parser.parseString(
        xml,
      )

    return {
      items:
        parsed.items as
          FlashRssFeedItem[],
    }
  }

export async function parseFlashRssCandidates(
  source:
    FlashRssIngestionSourcePlan,
  xml: string,
  options:
    ParseFlashRssCandidatesOptions = {},
): Promise<
  FlashRssCandidateParseResult
> {
  if (
    !source.ready ||
    !source.feedUrl
  ) {
    throw new Error(
      'Flash RSS source is not ready for ingestion.',
    )
  }

  const requestedMaxItems =
    Number.isInteger(
      options.maxItems,
    ) &&
    (options.maxItems ?? 0) > 0
      ? options.maxItems ?? 20
      : 20

  const maxItems =
    Math.min(
      requestedMaxItems,
      options.scanBeforeEligibility ? 50 : source.maxCandidatesPerScan,
      50,
    )

  const parseFeed =
    options.parseFeed ??
    defaultParseFeed

  const parsed =
    await parseFeed(
      xml,
    )

  const items =
    parsed.items ?? []

  const candidates:
    FlashRssCandidate[] = []

  let skippedItems = 0

  for (
    const item of
      items.slice(
        0,
        maxItems,
      )
  ) {
    const title =
      normalizeOptionalText(
        item.title,
      )

    let concreteUrl =
      item.link
        ? normalizeHttpUrl(
            item.link,
          )
        : null

    // Filter this mixed feed before eligibility/attempt allocation; podcasts are not articles.
    if (concreteUrl && new URL(source.registeredSourceUrl).hostname.replace(/^www\./, '') === 'microsoft.com') {
      try { concreteUrl = microsoftResearchArticleUrl(source.registeredSourceUrl, concreteUrl) } catch { concreteUrl = null }
    }

    if (
      !title ||
      !concreteUrl
    ) {
      skippedItems += 1
      continue
    }

    const rawPublishedAt = item.pubDate ?? item.isoDate
    const publishedAt = normalizePublishedAt(rawPublishedAt)

    candidates.push({
      sourceId:
        source.sourceId,
      sourceName:
        source.sourceName,
      sourceRole:
        source.sourceRole,
      editorialTrust:
        source.editorialTrust,
      citationMode:
        source.citationMode,
      feedUrl:
        source.feedUrl,
      title,
      concreteUrl,
      publishedAt,
      ...(rawPublishedAt?.trim() && publishedAt === null ? { publicationDateInvalid: true as const } : {}),
      summary:
        normalizeOptionalText(
          item.contentSnippet ??
          item.summary ??
          item.content,
        ),
    })
  }

  return {
    totalItems:
      Math.min(
        items.length,
        maxItems,
      ),
    skippedItems,
    candidates,
  }
}
