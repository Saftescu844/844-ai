import type {
  FlashHtmlArticleExtraction,
} from './htmlArticleExtraction'
import type {
  FlashHtmlListingSource,
} from './htmlListingCandidateIngestion'

export interface FlashNormalizedArticleCandidate {
  sourceId: number
  sourceName: string
  sourceRole:
    FlashHtmlListingSource['sourceRole']
  editorialTrust:
    FlashHtmlListingSource['editorialTrust']
  citationMode:
    FlashHtmlListingSource['citationMode']
  allowAutoPublish: boolean
  language: 'en'
  finalUrl: string
  canonicalUrl: string
  title: string
  contentType: string | null
  sourcePublicationDateRaw: string
  sourcePublicationDate: string
  lead: string
  bodyParagraphs: string[]
  bodyText: string
}

const ENGLISH_MONTHS:
  Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  }

function parseHttpUrl(
  value: string,
): URL | null {
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
      ? url
      : null
  } catch {
    return null
  }
}

function normalizePublicationDate(
  value: string,
): string {
  const match =
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(
      value.trim(),
    )

  if (!match) {
    throw new Error(
      'Flash normalized article has an unsupported publication date format.',
    )
  }

  const day =
    Number(
      match[1],
    )

  const month =
    ENGLISH_MONTHS[
      (match[2] ?? '')
        .toLowerCase()
    ]

  const year =
    Number(
      match[3],
    )

  if (
    !month ||
    !Number.isInteger(day) ||
    !Number.isInteger(year)
  ) {
    throw new Error(
      'Flash normalized article has an invalid publication date.',
    )
  }

  const parsed =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    )

  if (
    parsed.getUTCFullYear() !==
      year ||
    parsed.getUTCMonth() !==
      month - 1 ||
    parsed.getUTCDate() !==
      day
  ) {
    throw new Error(
      'Flash normalized article has an invalid publication date.',
    )
  }

  return [
    String(year)
      .padStart(
        4,
        '0',
      ),
    String(month)
      .padStart(
        2,
        '0',
      ),
    String(day)
      .padStart(
        2,
        '0',
      ),
  ].join(
    '-',
  )
}

function normalizeArticleUrl(
  value: string,
): {
  finalUrl: string
  canonicalUrl: string
  language: 'en'
} {
  const finalUrl =
    parseHttpUrl(
      value,
    )

  if (!finalUrl) {
    throw new Error(
      'Flash normalized article final URL is invalid.',
    )
  }

  if (
    !finalUrl.pathname.startsWith(
      '/en/news/',
    ) ||
    finalUrl.pathname ===
      '/en/news/'
  ) {
    throw new Error(
      'Flash normalized article URL must be an /en/news/... page.',
    )
  }

  const canonicalUrl =
    new URL(
      finalUrl.toString(),
    )

  canonicalUrl.search = ''
  canonicalUrl.hash = ''

  return {
    finalUrl:
      finalUrl.toString(),
    canonicalUrl:
      canonicalUrl.toString(),
    language:
      'en',
  }
}

export function normalizeFlashHtmlArticleCandidate(
  source:
    FlashHtmlListingSource,
  article:
    FlashHtmlArticleExtraction,
): FlashNormalizedArticleCandidate {
  const sourcePublicationDateRaw =
    article.publicationDate
      .trim()

  if (!sourcePublicationDateRaw) {
    throw new Error(
      'Flash normalized article publication date is empty.',
    )
  }

  const normalizedUrl =
    normalizeArticleUrl(
      article.finalUrl,
    )

  return {
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
    allowAutoPublish:
      source.allowAutoPublish,
    language:
      normalizedUrl.language,
    finalUrl:
      normalizedUrl.finalUrl,
    canonicalUrl:
      normalizedUrl.canonicalUrl,
    title:
      article.title,
    contentType:
      article.contentType,
    sourcePublicationDateRaw,
    sourcePublicationDate:
      normalizePublicationDate(
        sourcePublicationDateRaw,
      ),
    lead:
      article.lead,
    bodyParagraphs: [
      ...article.bodyParagraphs,
    ],
    bodyText:
      article.bodyText,
  }
}
