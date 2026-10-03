import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest'

import robots from '../../src/app/robots'

const originalSiteURL =
  process.env.SITE_URL

afterEach(() => {
  if (
    originalSiteURL === undefined
  ) {
    delete process.env.SITE_URL
  } else {
    process.env.SITE_URL =
      originalSiteURL
  }
})

describe('LR-001 robots contract', () => {
  it('blocks non-production environments', () => {
    process.env.SITE_URL =
      'https://844-ai-production.up.railway.app'

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    })
  })

  it('allows production indexing and advertises the sitemap', () => {
    process.env.SITE_URL =
      'https://844-ai.ro'

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
        },
      ],
      sitemap:
        'https://844-ai.ro/sitemap.xml',
    })
  })
})
