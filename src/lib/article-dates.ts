import type { Articole } from '@/payload-types'

type ArticleDateFields = Pick<
  Articole,
  'publishedAt' | 'significantUpdatedAt'
>

export type PublicArticleDates = {
  publishedAt?: string
  significantUpdatedAt?: string
}

function validDate(
  value: string | null | undefined,
): { value: string; timestamp: number } | null {
  if (!value) return null

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return {
    value,
    timestamp,
  }
}

export function getPublicArticleDates(
  article: ArticleDateFields,
): PublicArticleDates {
  const published =
    validDate(article.publishedAt)

  if (!published) {
    return {}
  }

  const significant =
    validDate(
      article.significantUpdatedAt,
    )

  return {
    publishedAt: published.value,
    ...(significant &&
    significant.timestamp > published.timestamp
      ? {
          significantUpdatedAt:
            significant.value,
        }
      : {}),
  }
}
