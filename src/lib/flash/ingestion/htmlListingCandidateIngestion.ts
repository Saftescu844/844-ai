import type {
  Surse,
} from '@/payload-types'

export interface FlashHtmlListingSource {
  sourceId: number
  sourceName: string
  registeredSourceUrl: string
  sourceRole:
    Surse['sourceRole']
  editorialTrust:
    Surse['editorialTrust']
  citationMode:
    Surse['citationMode']
  allowAutoPublish: boolean
}

export interface FlashHtmlListingCandidate {
  sourceId: number
  sourceName: string
  sourceRole:
    Surse['sourceRole']
  editorialTrust:
    Surse['editorialTrust']
  citationMode:
    Surse['citationMode']
  listingUrl: string
  title: string
  concreteUrl: string
}

export interface FlashHtmlListingParseResult {
  anchorsScanned: number
  candidates:
    FlashHtmlListingCandidate[]
}

export interface ParseFlashHtmlListingCandidatesOptions {
  maxItems?: number
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

function normalizedHostname(
  url: URL,
): string {
  const hostname =
    url.hostname
      .toLowerCase()
      .replace(/\.$/, '')

  return hostname.startsWith('www.')
    ? hostname.slice(4)
    : hostname
}

function decodeHtmlEntities(
  value: string,
): string {
  const named: Record<
    string,
    string
  > = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }

  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (
        entity.startsWith('#x') ||
        entity.startsWith('#X')
      ) {
        const codePoint =
          Number.parseInt(
            entity.slice(2),
            16,
          )

        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match
      }

      if (entity.startsWith('#')) {
        const codePoint =
          Number.parseInt(
            entity.slice(1),
            10,
          )

        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match
      }

      return named[
        entity.toLowerCase()
      ] ?? match
    },
  )
}

function normalizeAnchorText(
  html: string,
): string | null {
  const text =
    decodeHtmlEntities(
      html.replace(
        /<[^>]*>/g,
        ' ',
      ),
    )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()

  return text
    ? text
    : null
}

function normalizeNewsUrl(
  href: string,
  listingUrl: URL,
  registeredSourceUrl: URL,
): string | null {
  let candidate: URL

  try {
    candidate =
      new URL(
        decodeHtmlEntities(
          href.trim(),
        ),
        listingUrl,
      )
  } catch {
    return null
  }

  if (
    candidate.protocol !== 'http:' &&
    candidate.protocol !== 'https:'
  ) {
    return null
  }

  if (
    normalizedHostname(
      candidate,
    ) !==
    normalizedHostname(
      registeredSourceUrl,
    )
  ) {
    return null
  }

  if (
    !candidate.pathname.startsWith(
      '/en/news/',
    ) ||
    candidate.pathname ===
      '/en/news/'
  ) {
    return null
  }

  candidate.hash = ''
  candidate.search = ''

  return candidate.toString()
}

export function parseFlashHtmlListingCandidates(
  source:
    FlashHtmlListingSource,
  listingUrlValue: string,
  html: string,
  options:
    ParseFlashHtmlListingCandidatesOptions = {},
): FlashHtmlListingParseResult {
  const registeredSourceUrl =
    parseHttpUrl(
      source.registeredSourceUrl,
    )

  if (!registeredSourceUrl) {
    throw new Error(
      'Flash HTML listing source URL is invalid.',
    )
  }

  const listingUrl =
    parseHttpUrl(
      listingUrlValue,
    )

  if (!listingUrl) {
    throw new Error(
      'Flash HTML listing URL is invalid.',
    )
  }

  if (
    normalizedHostname(
      listingUrl,
    ) !==
    normalizedHostname(
      registeredSourceUrl,
    )
  ) {
    throw new Error(
      'Flash HTML listing must belong to the registered source host.',
    )
  }

  const maxItems =
    Number.isInteger(
      options.maxItems,
    ) &&
    (options.maxItems ?? 0) > 0
      ? Math.min(
          options.maxItems ?? 10,
          20,
        )
      : 10

  const candidates:
    FlashHtmlListingCandidate[] = []

  const seenUrls =
    new Set<string>()

  const anchorPattern =
    /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi

  let anchorsScanned = 0
  let match:
    RegExpExecArray | null

  while (
    candidates.length <
      maxItems &&
    (match =
      anchorPattern.exec(
        html,
      ))
  ) {
    anchorsScanned += 1

    const href =
      match[2] ?? ''

    const title =
      normalizeAnchorText(
        match[3] ?? '',
      )

    if (!title) {
      continue
    }

    const concreteUrl =
      normalizeNewsUrl(
        href,
        listingUrl,
        registeredSourceUrl,
      )

    if (
      !concreteUrl ||
      seenUrls.has(
        concreteUrl,
      )
    ) {
      continue
    }

    seenUrls.add(
      concreteUrl,
    )

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
      listingUrl:
        listingUrl.toString(),
      title,
      concreteUrl,
    })
  }

  return {
    anchorsScanned,
    candidates,
  }
}
