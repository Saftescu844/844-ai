import type { MetadataRoute } from 'next'
import { isPublicProductionSite } from '@/lib/public-environment'

export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (!isPublicProductionSite()) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  }
}
