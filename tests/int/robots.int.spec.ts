import { afterEach, describe, expect, it } from 'vitest'
import robots, { dynamic } from '@/app/robots'

const originalSiteURL = process.env.SITE_URL

afterEach(() => {
  if (originalSiteURL === undefined) delete process.env.SITE_URL
  else process.env.SITE_URL = originalSiteURL
})

describe('robots route', () => {
  it('is evaluated dynamically so SITE_URL is read at runtime', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('blocks crawling outside the public production site', () => {
    process.env.SITE_URL = 'https://844-ai-production.up.railway.app'

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    })
  })

  it('allows crawling on the canonical production site', () => {
    process.env.SITE_URL = 'https://844-ai.ro'

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
        },
      ],
    })
  })
})
