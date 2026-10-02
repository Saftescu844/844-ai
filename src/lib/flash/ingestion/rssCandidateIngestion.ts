import Parser from 'rss-parser'

import type {
  Payload,
} from 'payload'

import type {
  Surse,
} from '@/payload-types'

export type FlashRssIngestionBlocker =
  | 'invalid_feed_url'
  | 'invalid_source_url'
  | 'missing_feed_rss'

export interface FlashRssIngestionSourcePlan {
  sourceId: number
  sourceName: string
  registeredSourceUrl: string
  feedUrl: string | null
  sourceRole:
    Surse['sourceRole']
  editorialTrust:
    Surse['editorialTrust']
  citationMode:
    Surse['citationMode']
  allowAutoPublish: boolean
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

  const date =
    new Date(
      normalized,
    )

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date.toISOString()
}

export function assessFlashRssIngestionSource(
  source:
    FlashRssIngestionSourceRecord,
): FlashRssIngestionSourcePlan {
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
    ready:
      true,
    blocker:
      null,
  }
}

export async function planFlashRssIngestionSources(
  payload:
    FlashRssIngestionPayload,
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
      assessFlashRssIngestionSource(
        source,
      ),
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

  const maxItems =
    Number.isInteger(
      options.maxItems,
    ) &&
    (options.maxItems ?? 0) > 0
      ? Math.min(
          options.maxItems ?? 20,
          50,
        )
      : 20

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

    const concreteUrl =
      item.link
        ? normalizeHttpUrl(
            item.link,
          )
        : null

    if (
      !title ||
      !concreteUrl
    ) {
      skippedItems += 1
      continue
    }

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
      publishedAt:
        normalizePublishedAt(
          item.isoDate ??
          item.pubDate,
        ),
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
