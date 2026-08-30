import { describe, expect, it } from 'vitest'

import {
  isPublicLanguage,
  isPublicProductionSite,
} from '@/lib/public-environment'

describe('public environment guards', () => {
  it('accepts only the supported public languages', () => {
    expect(isPublicLanguage('ro')).toBe(true)
    expect(isPublicLanguage('en')).toBe(true)
    expect(isPublicLanguage('xx')).toBe(false)
    expect(isPublicLanguage('robots.txt')).toBe(false)
  })

  it('recognizes only the canonical production SITE_URL', () => {
    expect(isPublicProductionSite('https://844-ai.ro')).toBe(true)
    expect(isPublicProductionSite('https://844-ai.ro/')).toBe(true)
    expect(isPublicProductionSite('https://844-ai-production.up.railway.app')).toBe(false)
    expect(isPublicProductionSite(undefined)).toBe(false)
  })
})
