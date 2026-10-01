import {
  getPublicArticleDates,
} from '@/lib/article-dates'

type ArticleDatesProps = {
  publishedAt?: string | null
  significantUpdatedAt?: string | null
  lang: string
}

function formatDate(
  value: string,
  lang: string,
): string {
  return new Intl.DateTimeFormat(
    lang === 'ro' ? 'ro-RO' : 'en-GB',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(new Date(value))
}

export default function ArticleDates({
  publishedAt,
  significantUpdatedAt,
  lang,
}: ArticleDatesProps) {
  const dates = getPublicArticleDates({
    publishedAt,
    significantUpdatedAt,
  })

  if (!dates.publishedAt) {
    return null
  }

  const publishedLabel =
    lang === 'ro' ? 'Publicat' : 'Published'

  const updatedLabel =
    lang === 'ro'
      ? 'Actualizat semnificativ'
      : 'Significantly updated'

  return (
    <div
      style={{
        color: '#888',
        fontSize: 14,
        marginBottom: 28,
      }}
    >
      <p style={{ margin: 0 }}>
        {publishedLabel}:{' '}
        {formatDate(
          dates.publishedAt,
          lang,
        )}
      </p>

      {dates.significantUpdatedAt && (
        <p
          style={{
            margin: '3px 0 0',
          }}
        >
          {updatedLabel}:{' '}
          {formatDate(
            dates.significantUpdatedAt,
            lang,
          )}
        </p>
      )}
    </div>
  )
}
