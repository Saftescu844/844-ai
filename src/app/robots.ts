import type { MetadataRoute } from 'next'
import { isPublicProductionSite } from '@/lib/public-environment'

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
