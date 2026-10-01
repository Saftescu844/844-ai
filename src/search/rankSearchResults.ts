import type { Search } from '../payload-types'
import { normalizeSearchText } from './normalizeSearchText'

export type RankableSearchResult = Pick<
  Search,
  'id' | 'title' | 'excerpt' | 'publishedAt'
>

type RelevanceVector = {
  exactTitle: number
  titlePhrase: number
  titleTokenMatches: number
  excerptPhrase: number
  excerptTokenMatches: number
  publishedAt: number
}

function countMatches(
  text: string,
  tokens: string[],
) {
  return tokens.reduce(
    (count, token) =>
      text.includes(token) ? count + 1 : count,
    0,
  )
}

function publishedAtValue(
  value: string | null | undefined,
) {
  if (!value) return 0

  const timestamp = Date.parse(value)

  return Number.isNaN(timestamp) ? 0 : timestamp
}

function buildRelevanceVector(
  doc: RankableSearchResult,
  normalizedQuery: string,
  tokens: string[],
): RelevanceVector {
  const title = normalizeSearchText(doc.title ?? '')
  const excerpt = normalizeSearchText(doc.excerpt ?? '')

  return {
    exactTitle:
      title === normalizedQuery ? 1 : 0,
    titlePhrase:
      normalizedQuery &&
      title.includes(normalizedQuery)
        ? 1
        : 0,
    titleTokenMatches: countMatches(title, tokens),
    excerptPhrase:
      normalizedQuery &&
      excerpt.includes(normalizedQuery)
        ? 1
        : 0,
    excerptTokenMatches: countMatches(
      excerpt,
      tokens,
    ),
    publishedAt: publishedAtValue(doc.publishedAt),
  }
}

export function rankSearchResults<
  T extends RankableSearchResult,
>(
  docs: T[],
  query: string,
  queryTokens: string[],
): T[] {
  const normalizedQuery = normalizeSearchText(query)

  const tokens = [
    ...new Set(
      queryTokens
        .map(normalizeSearchText)
        .filter(Boolean),
    ),
  ]

  const ranked = docs.map((doc) => ({
    doc,
    relevance: buildRelevanceVector(
      doc,
      normalizedQuery,
      tokens,
    ),
  }))

  ranked.sort((a, b) => {
    const fields: Array<
      keyof RelevanceVector
    > = [
      'exactTitle',
      'titlePhrase',
      'titleTokenMatches',
      'excerptPhrase',
      'excerptTokenMatches',
      'publishedAt',
    ]

    for (const field of fields) {
      const difference =
        b.relevance[field] -
        a.relevance[field]

      if (difference !== 0) {
        return difference
      }
    }

    return a.doc.id - b.doc.id
  })

  return ranked.map(({ doc }) => doc)
}
