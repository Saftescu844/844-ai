import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildRomanianPublisherSeo,
  normalizePublisherExcerpt,
  PUBLISHER_EXCERPT_LIMIT,
  PUBLISHER_SEO_DESCRIPTION_LIMIT,
  PUBLISHER_SEO_TITLE_LIMIT,
} from '@/lib/legacy-publisher-editorial-text'

const publishers = [
  'publish-rss.ts',
  'publish-health.ts',
  'publish-education.ts',
  'publish-business.ts',
] as const

describe('legacy publisher excerpt and Romanian SEO', () => {
  it('keeps a short summary and normalizes whitespace', () => {
    expect(normalizePublisherExcerpt('  Un rezumat   corect.  ')).toBe(
      'Un rezumat corect.',
    )
    expect(normalizePublisherExcerpt('  ')).toBe('')
  })

  it('prefers a complete sentence near the excerpt limit', () => {
    const first = 'Prima propoziție oferă context suficient pentru un rezumat editorial.'
    const source = first +
      ' A doua propoziție introduce multe informații suplimentare care depășesc limita stabilită pentru extras.'
    expect(normalizePublisherExcerpt(source, 105)).toBe(first)
  })

  it('never cuts an ordinary Romanian word in half', () => {
    const source = Array.from({ length: 90 }, () => 'inteligența').join(' ')
    const excerpt = normalizePublisherExcerpt(source)
    expect(excerpt.length).toBeLessThanOrEqual(PUBLISHER_EXCERPT_LIMIT)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(source.startsWith(excerpt.slice(0, -1))).toBe(true)
    expect(source.charAt(excerpt.length - 1)).toBe(' ')
  })

  it('does not change text that already fits exactly', () => {
    const source = 'a'.repeat(PUBLISHER_EXCERPT_LIMIT)
    expect(normalizePublisherExcerpt(source)).toBe(source)
  })

  it('does not invent a fragment when no whole word fits', () => {
    expect(normalizePublisherExcerpt('x'.repeat(450))).toBe('')
  })

  it('builds bounded Romanian SEO without calling a provider', () => {
    const title =
      'O analiză foarte detaliată despre schimbările produse de inteligența artificială în economie'
    const excerpt = Array.from({ length: 45 }, () => 'cercetare').join(' ')
    const seo = buildRomanianPublisherSeo(title, excerpt)

    expect(seo.metaTitle.length).toBeGreaterThan(0)
    expect(seo.metaTitle.length).toBeLessThanOrEqual(
      PUBLISHER_SEO_TITLE_LIMIT,
    )
    expect(title.startsWith(seo.metaTitle)).toBe(true)
    expect(seo.metaDescription.length).toBeGreaterThan(0)
    expect(seo.metaDescription.length).toBeLessThanOrEqual(
      PUBLISHER_SEO_DESCRIPTION_LIMIT,
    )
    expect(excerpt.startsWith(seo.metaDescription.slice(0, -1))).toBe(true)
  })

  for (const filename of publishers) {
    it(`${filename} normalizes both languages and preserves review-only drafts`, () => {
      const source = readFileSync(
        resolve(process.cwd(), filename),
        'utf8',
      )
      expect(source).toContain(
        "const excerptRo = normalizePublisherExcerpt(art.excerpt || '')",
      )
      expect(source).toContain(
        'const seoRo = buildRomanianPublisherSeo(art.titlu, excerptRo)',
      )
      expect(source).toContain(
        'excerpt: excerptRo, ...seoRo, continut:',
      )
      expect(source).toContain(
        'excerpt: normalizePublisherExcerpt(tradus.excerpt || \'\')',
      )
      expect(source).toContain(
        'excerpt: excerptRo, continut: htmlToLexical(art.continut)',
      )
      expect((source.match(/draft:\\s*true/g) ?? []).length)
        .toBeGreaterThanOrEqual(3)
      expect((source.match(/editorialStatus:\\s*'review'/g) ?? []).length)
        .toBe(2)
      expect(source).not.toContain('publishedAt:')
    })
  }
})
