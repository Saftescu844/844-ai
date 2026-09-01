import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import ArticleView from '@/components/ArticleView'
import { getPublicArticleDates } from '@/lib/article-dates'
import { resolvePublicArticleAttribution } from '@/lib/article-attribution'
import { getArticol, getCachedSiteSettings } from '@/lib/payload'

export async function generateMetadata(props: {
  params: Promise<{ lang: string; slug: string }>
}): Promise<Metadata> {
  const { lang, slug } = await props.params
  const articol = await getArticol(slug, lang)

  if (!articol) return {}

  const title = articol.metaTitle || articol.titlu
  const description = articol.metaDescription || articol.excerpt || ''
  const url = `/${lang}/articol/${slug}`
  const publicDates =
    getPublicArticleDates(articol)

  const img = articol.imaginePrincipala
  const imgUrl =
    img && typeof img === 'object' && img.url
      ? img.url
      : null

  const alt = articol.versiuneAlternativa
  const altObj =
    alt && typeof alt === 'object'
      ? alt
      : null

  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(altObj?._status === 'published' && altObj.slug
        ? {
            languages: {
              [lang === 'ro' ? 'en' : 'ro']:
                `/${altObj.limba}/articol/${altObj.slug}`,
            },
          }
        : {}),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      locale: lang === 'ro' ? 'ro_RO' : 'en_US',
      ...(imgUrl ? { images: [{ url: imgUrl }] } : {}),
      ...(publicDates.publishedAt
        ? {
            publishedTime:
              publicDates.publishedAt,
          }
        : {}),
      ...(publicDates.significantUpdatedAt
        ? {
            modifiedTime:
              publicDates.significantUpdatedAt,
          }
        : {}),
    },
  }
}

export default async function PaginaArticol(props: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { lang, slug } = await props.params

  const [articol, siteSettings] = await Promise.all([
    getArticol(slug, lang),
    getCachedSiteSettings(lang),
  ])

  if (!articol) {
    notFound()
  }

  const language =
    lang === 'en' ? 'en' : 'ro'

  const attribution =
    await resolvePublicArticleAttribution(
      articol,
      language,
    )

  return (
    <ArticleView
      articol={articol}
      lang={lang}
      attribution={attribution}
      newsletterSettings={siteSettings?.newsletter}
    />
  )
}
