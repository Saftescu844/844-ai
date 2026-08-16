import type { Where } from 'payload'

import type { Search } from '@/payload-types'
import { payloadClient } from '@/lib/payload'
import { normalizeSearchText } from '@/search/normalizeSearchText'
import { rankSearchResults } from '@/search/rankSearchResults'

export const SEARCH_QUERY_MIN_LENGTH = 2
export const SEARCH_QUERY_MAX_LENGTH = 120
export const SEARCH_QUERY_MAX_TOKENS = 8
export const SEARCH_RESULTS_LIMIT = 20
export const SEARCH_CANDIDATE_LIMIT = 100

const VALID_LANGUAGES = new Set(['ro', 'en'])

export type SearchQueryState =
  | 'ready'
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'invalid-language'

export type SearchArticlesResult = {
  state: SearchQueryState
  query: string
  tokens: string[]
  docs: Search[]
  totalDocs: number
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function tokenizeQuery(query: string) {
  const normalizedQuery = normalizeSearchText(query)

  const matches =
    normalizedQuery.match(
      /[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu,
    ) ?? []

  const uniqueTokens = new Set(
    matches.filter(
      (token) => token.length >= SEARCH_QUERY_MIN_LENGTH,
    ),
  )

  return [...uniqueTokens].slice(
    0,
    SEARCH_QUERY_MAX_TOKENS,
  )
}

function buildTokenWhere(token: string): Where {
  return {
    or: [
      {
        title: {
          contains: token,
        },
      },
      {
        excerpt: {
          contains: token,
        },
      },
      {
        keywords: {
          contains: token,
        },
      },
    ],
  }
}

function emptyResult(
  state: Exclude<SearchQueryState, 'ready'>,
  query: string,
): SearchArticlesResult {
  return {
    state,
    query,
    tokens: [],
    docs: [],
    totalDocs: 0,
  }
}

export async function searchArticles(
  language: string,
  rawQuery: string,
): Promise<SearchArticlesResult> {
  if (!VALID_LANGUAGES.has(language)) {
    return emptyResult('invalid-language', '')
  }

  const query = normalizeWhitespace(rawQuery)

  if (!query) {
    return emptyResult('empty', query)
  }

  if (query.length < SEARCH_QUERY_MIN_LENGTH) {
    return emptyResult('too-short', query)
  }

  if (query.length > SEARCH_QUERY_MAX_LENGTH) {
    return emptyResult('too-long', query)
  }

  const tokens = tokenizeQuery(query)

  if (tokens.length === 0) {
    return emptyResult('too-short', query)
  }

  const payload = await payloadClient()

  const result = await payload.find({
    collection: 'search',
    overrideAccess: false,
    depth: 0,
    limit: SEARCH_CANDIDATE_LIMIT,
    sort: '-publishedAt',
    where: {
      and: [
        {
          isPublic: {
            equals: true,
          },
        },
        {
          language: {
            equals: language,
          },
        },
        ...tokens.map(buildTokenWhere),
      ],
    },
  })

  const docs = rankSearchResults(
    result.docs,
    query,
    tokens,
  ).slice(0, SEARCH_RESULTS_LIMIT)

  return {
    state: 'ready',
    query,
    tokens,
    docs,
    totalDocs: result.totalDocs,
  }
}
