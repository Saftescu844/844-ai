import type {
  Articole,
  FlashAi,
} from '@/payload-types'
import { payloadClient } from '@/lib/payload'
import { normalizeSearchText } from '@/search/normalizeSearchText'
import { rankSearchResults } from '@/search/rankSearchResults'
import {
  buildNormalizedSearchText,
  extractLexicalText,
  matchesAllSearchTokens,
} from '@/search/searchDocumentText'

export const SEARCH_QUERY_MIN_LENGTH = 2
export const SEARCH_QUERY_MAX_LENGTH = 120
export const SEARCH_QUERY_MAX_TOKENS = 8
export const SEARCH_RESULTS_LIMIT = 20

const VALID_LANGUAGES =
  new Set(['ro', 'en'])

export type SearchQueryState =
  | 'ready'
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'invalid-language'

export type SearchPublicDocument = {
  id: string
  kind: 'article' | 'flash'
  sourceId: number
  title: string
  excerpt?: string | null
  url: string
  publishedAt?: string | null
  articleType?: Articole['tip'] | null
  flashType?: FlashAi['flashType'] | null
  bodyText: string
  searchText: string
}

export type SearchArticlesResult = {
  state: SearchQueryState
  query: string
  tokens: string[]
  docs: SearchPublicDocument[]
  totalDocs: number
}

function normalizeWhitespace(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
}

function tokenizeQuery(
  query: string,
) {
  const normalizedQuery =
    normalizeSearchText(
      query,
    )

  const matches =
    normalizedQuery.match(
      /[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu,
    ) ?? []

  const uniqueTokens =
    new Set(
      matches.filter(
        token =>
          token.length >=
          SEARCH_QUERY_MIN_LENGTH,
      ),
    )

  return [
    ...uniqueTokens,
  ].slice(
    0,
    SEARCH_QUERY_MAX_TOKENS,
  )
}

function articleTagsText(
  article: Articole,
): string {
  if (!Array.isArray(article.tags)) {
    return ''
  }

  return article.tags
    .map(item =>
      typeof item?.tag ===
      'string'
        ? item.tag
        : '',
    )
    .filter(Boolean)
    .join(' ')
}

function mapArticle(
  article: Articole,
  language: string,
): SearchPublicDocument {
  const bodyText =
    extractLexicalText(
      article.continut,
    )

  const tagsText =
    articleTagsText(
      article,
    )

  const title =
    article.titlu.trim()

  const excerpt =
    article.excerpt?.trim() ||
    null

  return {
    id: `article-${article.id}`,
    kind: 'article',
    sourceId: article.id,
    title,
    excerpt,
    url:
      `/${language}/articol/${article.slug}`,
    publishedAt:
      article.publishedAt ??
      null,
    articleType:
      article.tip,
    flashType: null,
    bodyText,
    searchText:
      buildNormalizedSearchText(
        [
          title,
          excerpt,
          tagsText,
          bodyText,
        ],
      ),
  }
}

function mapFlash(
  flash: FlashAi,
  language: string,
): SearchPublicDocument {
  const bodyText =
    extractLexicalText(
      flash.continut,
    )

  const title =
    flash.titlu.trim()

  const excerpt =
    flash.excerpt?.trim() ||
    null

  return {
    id: `flash-${flash.id}`,
    kind: 'flash',
    sourceId: flash.id,
    title,
    excerpt,
    url:
      `/${language}/flash/${flash.slug}`,
    publishedAt:
      flash.publishedAt ??
      null,
    articleType: null,
    flashType:
      flash.flashType,
    bodyText,
    searchText:
      buildNormalizedSearchText(
        [
          title,
          excerpt,
          bodyText,
        ],
      ),
  }
}

function emptyResult(
  state: Exclude<
    SearchQueryState,
    'ready'
  >,
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
  if (
    !VALID_LANGUAGES.has(
      language,
    )
  ) {
    return emptyResult(
      'invalid-language',
      '',
    )
  }

  const query =
    normalizeWhitespace(
      rawQuery,
    )

  if (!query) {
    return emptyResult(
      'empty',
      query,
    )
  }

  if (
    query.length <
    SEARCH_QUERY_MIN_LENGTH
  ) {
    return emptyResult(
      'too-short',
      query,
    )
  }

  if (
    query.length >
    SEARCH_QUERY_MAX_LENGTH
  ) {
    return emptyResult(
      'too-long',
      query,
    )
  }

  const tokens =
    tokenizeQuery(
      query,
    )

  if (
    tokens.length === 0
  ) {
    return emptyResult(
      'too-short',
      query,
    )
  }

  const payload =
    await payloadClient()

  const [
    articleResult,
    flashResult,
  ] =
    await Promise.all([
      payload.find({
        collection:
          'articole',
        depth: 0,
        pagination:
          false,
        where: {
          and: [
            {
              limba: {
                equals:
                  language,
              },
            },
            {
              _status: {
                equals:
                  'published',
              },
            },
          ],
        },
      }),
      payload.find({
        collection:
          'flash-ai',
        depth: 0,
        pagination:
          false,
        where: {
          and: [
            {
              limba: {
                equals:
                  language,
              },
            },
            {
              _status: {
                equals:
                  'published',
              },
            },
          ],
        },
      }),
    ])

  const candidates = [
    ...articleResult.docs.map(
      article =>
        mapArticle(
          article,
          language,
        ),
    ),
    ...flashResult.docs.map(
      flash =>
        mapFlash(
          flash,
          language,
        ),
    ),
  ]

  const matched =
    candidates.filter(
      candidate =>
        matchesAllSearchTokens(
          candidate.searchText,
          tokens,
        ),
    )

  const ranked =
    rankSearchResults(
      matched,
      query,
      tokens,
    )

  return {
    state: 'ready',
    query,
    tokens,
    docs: ranked.slice(
      0,
      SEARCH_RESULTS_LIMIT,
    ),
    totalDocs:
      matched.length,
  }
}
