export interface FlashHtmlArticleExtraction {
  finalUrl: string
  title: string
  contentType: string | null
  publicationDate: string
  lead: string
  bodyParagraphs: string[]
  bodyText: string
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

function normalizeText(
  html: string,
): string {
  return decodeHtmlEntities(
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
}

function extractRequired(
  html: string,
  pattern: RegExp,
  fieldName: string,
): string {
  const match =
    pattern.exec(
      html,
    )

  const value =
    match?.[1]
      ? normalizeText(
          match[1],
        )
      : ''

  if (!value) {
    throw new Error(
      `Flash HTML article is missing ${fieldName}.`,
    )
  }

  return value
}

function extractPageMetaItems(
  html: string,
): string[] {
  const listMatch =
    /<ul\b[^>]*class=["'][^"']*\becl-page-header__meta\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i.exec(
      html,
    )

  if (!listMatch?.[1]) {
    return []
  }

  const items: string[] = []
  const itemPattern =
    /<li\b[^>]*>([\s\S]*?)<\/li>/gi

  let match:
    RegExpExecArray | null

  while (
    (match =
      itemPattern.exec(
        listMatch[1],
      ))
  ) {
    const value =
      normalizeText(
        match[1] ?? '',
      )

    if (value) {
      items.push(
        value,
      )
    }
  }

  return items
}

function extractBodyParagraphs(
  html: string,
): string[] {
  const bodyMatch =
    /<div\b[^>]*class=["'][^"']*\bcnt-main-body\b[^"']*["'][^>]*>\s*<div\b[^>]*class=["'][^"']*\becl\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i.exec(
      html,
    )

  if (!bodyMatch?.[1]) {
    throw new Error(
      'Flash HTML article is missing main body.',
    )
  }

  const paragraphs:
    string[] = []

  const paragraphPattern =
    /<p\b[^>]*>([\s\S]*?)<\/p>/gi

  let match:
    RegExpExecArray | null

  while (
    (match =
      paragraphPattern.exec(
        bodyMatch[1],
      ))
  ) {
    const paragraph =
      normalizeText(
        match[1] ?? '',
      )

    if (paragraph) {
      paragraphs.push(
        paragraph,
      )
    }
  }

  if (
    paragraphs.length ===
    0
  ) {
    throw new Error(
      'Flash HTML article main body has no paragraphs.',
    )
  }

  return paragraphs
}

export function extractFlashHtmlArticle(
  registeredSourceUrlValue: string,
  finalUrlValue: string,
  html: string,
): FlashHtmlArticleExtraction {
  const registeredSourceUrl =
    parseHttpUrl(
      registeredSourceUrlValue,
    )

  if (!registeredSourceUrl) {
    throw new Error(
      'Flash HTML article registered source URL is invalid.',
    )
  }

  const finalUrl =
    parseHttpUrl(
      finalUrlValue,
    )

  if (!finalUrl) {
    throw new Error(
      'Flash HTML article final URL is invalid.',
    )
  }

  const registeredHost =
    registeredSourceUrl.hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/\.$/, '')

  const finalHost =
    finalUrl.hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/\.$/, '')

  if (
    finalHost !==
    registeredHost
  ) {
    throw new Error(
      'Flash HTML article must belong to the registered source host.',
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
      'Flash HTML article URL must be an /en/news/... page.',
    )
  }

  const title =
    extractRequired(
      html,
      /<h1\b[^>]*class=["'][^"']*\becl-page-header__title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
      'title',
    )

  const lead =
    extractRequired(
      html,
      /<p\b[^>]*class=["'][^"']*\becl-page-header-standardised__description\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
      'lead',
    )

  const metaItems =
    extractPageMetaItems(
      html,
    )

  const publicationMeta =
    metaItems.find(
      item =>
        /^Publication\s+/i.test(
          item,
        ),
    )

  if (!publicationMeta) {
    throw new Error(
      'Flash HTML article is missing publication date.',
    )
  }

  const publicationDate =
    publicationMeta.replace(
      /^Publication\s+/i,
      '',
    ).trim()

  if (!publicationDate) {
    throw new Error(
      'Flash HTML article publication date is empty.',
    )
  }

  const contentType =
    metaItems.find(
      item =>
        !/^Publication\s+/i.test(
          item,
        ),
    ) ?? null

  const bodyParagraphs =
    extractBodyParagraphs(
      html,
    )

  finalUrl.hash = ''

  return {
    finalUrl:
      finalUrl.toString(),
    title,
    contentType,
    publicationDate,
    lead,
    bodyParagraphs,
    bodyText:
      bodyParagraphs.join(
        '\n\n',
      ),
  }
}
