import type {
  FlashVerifiedSupportingSource,
} from './verifiedSupportingSourcePack'

export const FLASH_SUPPORTING_POLICY_MAX_TEXT_CHARS =
  12_000

export interface FlashSupportingPolicySemanticMaterial {
  id: string
  sourceUrl: string
  title: string
  semanticText: string
  textLength: number
  wordCount: number
}

const STOP_HEADINGS =
  new Set([
    'related content',
    'quick links',
    'about us',
  ])

function decodeHtmlEntities(
  value: string,
): string {
  const named: Record<string, string> = {
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
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function countWords(
  value: string,
): number {
  const normalized =
    value.trim()

  return normalized
    ? normalized.split(/\s+/u).length
    : 0
}

function comparablePolicyUrl(
  value: string,
): URL {
  let url: URL

  try {
    url =
      new URL(
        value,
      )
  } catch {
    throw new Error(
      'Supporting policy source URL is invalid.',
    )
  }

  if (
    (url.protocol !== 'https:' &&
      url.protocol !== 'http:') ||
    !url.hostname
  ) {
    throw new Error(
      'Supporting policy source URL must be HTTP(S).',
    )
  }

  if (
    !url.pathname.startsWith(
      '/en/policies/',
    ) ||
    url.pathname ===
      '/en/policies/'
  ) {
    throw new Error(
      'Supporting semantic extraction currently requires an /en/policies/... page.',
    )
  }

  url.hash = ''

  return url
}

function stripNonContentElements(
  html: string,
): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
}

function extractPageTitle(
  html: string,
): string {
  const match =
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(
      html,
    )

  const title =
    match?.[1]
      ? normalizeText(
          match[1],
        )
      : ''

  if (!title) {
    throw new Error(
      'Supporting policy page is missing an h1 title.',
    )
  }

  return title
}

function extractMainHtml(
  html: string,
): string {
  const match =
    /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(
      html,
    )

  if (!match?.[1]) {
    throw new Error(
      'Supporting policy page is missing main content.',
    )
  }

  return match[1]
}

interface SemanticBlock {
  kind:
    | 'heading'
    | 'paragraph'
    | 'listItem'
  level: number | null
  text: string
}

function extractSemanticBlocks(
  mainHtml: string,
): SemanticBlock[] {
  const blocks: SemanticBlock[] = []
  const pattern =
    /<(h1|h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi

  let match:
    RegExpExecArray | null

  while (
    (match =
      pattern.exec(
        mainHtml,
      ))
  ) {
    const tag =
      match[1]
        ?.toLowerCase() ??
      ''

    const text =
      normalizeText(
        match[2] ?? '',
      )

    if (!text) {
      continue
    }

    if (
      tag === 'h1' ||
      tag === 'h2' ||
      tag === 'h3'
    ) {
      blocks.push({
        kind: 'heading',
        level:
          Number.parseInt(
            tag.slice(1),
            10,
          ),
        text,
      })

      continue
    }

    blocks.push({
      kind:
        tag === 'li'
          ? 'listItem'
          : 'paragraph',
      level: null,
      text,
    })
  }

  return blocks
}

function buildBoundedSemanticText(
  blocks: SemanticBlock[],
  title: string,
): string {
  const selected:
    string[] = [
      title,
    ]

  let currentSectionListCount = 0
  let currentSectionListStartIndex:
    number | null = null

  for (const block of blocks) {
    if (
      block.kind === 'heading'
    ) {
      if (block.level === 1) {
        continue
      }

      const normalizedHeading =
        block.text
          .toLowerCase()
          .trim()

      if (
        STOP_HEADINGS.has(
          normalizedHeading,
        )
      ) {
        break
      }

      currentSectionListCount = 0
      currentSectionListStartIndex =
        null

      selected.push(
        block.text,
      )

      continue
    }

    if (
      block.kind === 'listItem'
    ) {
      currentSectionListCount += 1

      if (
        currentSectionListStartIndex ===
        null
      ) {
        currentSectionListStartIndex =
          selected.length
      }

      if (
        currentSectionListCount <= 8
      ) {
        selected.push(
          block.text,
        )
      } else if (
        currentSectionListCount === 9 &&
        currentSectionListStartIndex !==
          null
      ) {
        selected.splice(
          currentSectionListStartIndex,
        )
      }

      continue
    }

    selected.push(
      block.text,
    )
  }

  const bounded:
    string[] = []

  let usedCharacters = 0

  for (const block of selected) {
    const separatorLength =
      bounded.length > 0
        ? 2
        : 0

    const nextLength =
      usedCharacters +
      separatorLength +
      block.length

    if (
      nextLength >
      FLASH_SUPPORTING_POLICY_MAX_TEXT_CHARS
    ) {
      break
    }

    bounded.push(
      block,
    )

    usedCharacters =
      nextLength
  }

  const semanticText =
    bounded.join(
      '\n\n',
    )

  if (
    semanticText.length === 0
  ) {
    throw new Error(
      'Supporting policy semantic material is empty.',
    )
  }

  return semanticText
}

/**
 * REG-001U deterministic HTML-to-semantic-material extraction for explicitly
 * verified European Commission policy pages.
 *
 * This stage does not discover sources, call a model, judge factual truth,
 * mutate persistence readiness, or write to Payload. It strips page chrome,
 * reads the page h1 even when the EC layout places it outside <main>, keeps
 * semantic h2/h3/p content plus bounded short lists from <main>, stops before
 * generic trailing sections such as Related Content, and caps the final text
 * at a block boundary before semantic-provider use.
 */
export function extractFlashSupportingPolicySemanticMaterial(
  source:
    FlashVerifiedSupportingSource,
): FlashSupportingPolicySemanticMaterial {
  const sourceUrl =
    comparablePolicyUrl(
      source.finalUrl ??
      source.concreteUrl,
    )

  const cleanedHtml =
    stripNonContentElements(
      source.textContent,
    )

  const title =
    extractPageTitle(
      cleanedHtml,
    )

  const mainHtml =
    extractMainHtml(
      cleanedHtml,
    )

  const semanticText =
    buildBoundedSemanticText(
      extractSemanticBlocks(
        mainHtml,
      ),
      title,
    )

  return {
    id:
      source.id,
    sourceUrl:
      sourceUrl.toString(),
    title,
    semanticText,
    textLength:
      semanticText.length,
    wordCount:
      countWords(
        semanticText,
      ),
  }
}
