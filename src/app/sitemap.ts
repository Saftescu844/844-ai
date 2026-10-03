import type { MetadataRoute } from 'next'

import { payloadClient } from '@/lib/payload'
import {
  isPublicLanguage,
  isPublicProductionSite,
  PUBLIC_LANGUAGES,
} from '@/lib/public-environment'

export const dynamic = 'force-dynamic'

const SITE = 'https://844-ai.ro'

const PILLARS = [
  'stiri',
  'sanatate',
  'educatie',
  'tools',
  'afaceri',
] as const

function lastModified(
  item: {
    significantUpdatedAt?: string | null
    updatedAt?: string | null
    publishedAt?: string | null
  },
): string | undefined {
  return (
    item.significantUpdatedAt ||
    item.updatedAt ||
    item.publishedAt ||
    undefined
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isPublicProductionSite()) {
    return []
  }

  const payload = await payloadClient()

  const [articles, flashes] = await Promise.all([
    payload.find({
      collection: 'articole',
      where: {
        _status: {
          equals: 'published',
        },
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: {
        slug: true,
        limba: true,
        publishedAt: true,
        significantUpdatedAt: true,
        updatedAt: true,
      },
    }),
    payload.find({
      collection: 'flash-ai',
      where: {
        _status: {
          equals: 'published',
        },
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: {
        slug: true,
        limba: true,
        publishedAt: true,
        significantUpdatedAt: true,
        updatedAt: true,
      },
    }),
  ])

  const staticEntries: MetadataRoute.Sitemap =
    PUBLIC_LANGUAGES.flatMap((lang) => [
      {
        url: `${SITE}/${lang}`,
      },
      ...PILLARS.map((pillar) => ({
        url: `${SITE}/${lang}/pilon/${pillar}`,
      })),
    ])

  const articleEntries: MetadataRoute.Sitemap =
    articles.docs.flatMap((article) => {
      if (
        !article.slug ||
        !isPublicLanguage(article.limba)
      ) {
        return []
      }

      return [
        {
          url: `${SITE}/${article.limba}/articol/${article.slug}`,
          lastModified: lastModified(article),
        },
      ]
    })

  const flashEntries: MetadataRoute.Sitemap =
    flashes.docs.flatMap((flash) => {
      if (
        !flash.slug ||
        !isPublicLanguage(flash.limba)
      ) {
        return []
      }

      return [
        {
          url: `${SITE}/${flash.limba}/flash/${flash.slug}`,
          lastModified: lastModified(flash),
        },
      ]
    })

  return [
    ...staticEntries,
    ...articleEntries,
    ...flashEntries,
  ]
}
