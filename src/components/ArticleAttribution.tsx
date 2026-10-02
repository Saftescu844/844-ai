import type {
  PublicArticleAttribution,
} from '@/lib/article-attribution'

type ArticleAttributionProps = {
  attribution: PublicArticleAttribution
  lang: string
}

export default function ArticleAttribution({
  attribution,
  lang,
}: ArticleAttributionProps) {
  const author = attribution.primaryAuthor

  if (!author) {
    return null
  }

  const label =
    lang === 'ro' ? 'De' : 'By'

  const authorPath =
    lang === 'ro' ? 'autori' : 'authors'

  const href =
    `/${lang}/${authorPath}/${author.slug}`

  return (
    <p
      style={{
        margin: '0 0 4px',
        fontSize: 14,
        color: '#555',
      }}
    >
      {label}{' '}
      <a
        href={href}
        style={{
          color: '#185FA5',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        {author.fullName}
      </a>
    </p>
  )
}
