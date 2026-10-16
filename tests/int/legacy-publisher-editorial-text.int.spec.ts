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
    expect(
      title.startsWith(
        seo.metaTitle.endsWith('…')
          ? seo.metaTitle.slice(0, -1)
          : seo.metaTitle,
      ),
    ).toBe(true)
    expect(seo.metaDescription.length).toBeGreaterThan(0)
    expect(seo.metaDescription.length).toBeLessThanOrEqual(
      PUBLISHER_SEO_DESCRIPTION_LIMIT,
    )
    expect(excerpt.startsWith(seo.metaDescription.slice(0, -1))).toBe(true)
  })


  it('avoids Romanian connecting words at the end of a shortened SEO title', () => {
    const title =
      'Un laborator european prezintă o nouă metodă de evaluare a inteligenței artificiale'
    const seo = buildRomanianPublisherSeo(title, 'Rezumat.')
    expect(seo.metaTitle).toBe(
      'Un laborator european prezintă o nouă metodă de evaluare…',
    )
    expect(seo.metaTitle.length).toBeLessThanOrEqual(PUBLISHER_SEO_TITLE_LIMIT)
    expect(seo.metaTitle).not.toMatch(/\b(?:a|de|și|prin|pentru|cu)…$/u)
  })

  it('drops unfinished coordinated phrases instead of leaving a dangling conjunction', () => {
    const title =
      'Asistența clinică prin inteligență artificială și limitele noilor sisteme de sprijin'
    expect(buildRomanianPublisherSeo(title, 'Rezumat.').metaTitle).toBe(
      'Asistența clinică prin inteligență artificială…',
    )
  })

  it('keeps a full title if already short enough', () => {
    expect(buildRomanianPublisherSeo('Actualizări AI', 'Rezumat.').metaTitle)
      .toBe('Actualizări AI')
  })

  it('does not split a long unbreakable SEO token or fabricate words', () => {
    const seo = buildRomanianPublisherSeo('X'.repeat(90), 'Rezumat valid.')
    expect(seo.metaTitle).toBe('')
    expect(seo.metaDescription).toBe('Rezumat valid.')
  })

  it('fails closed for an unbreakable excerpt without cutting inside a word', () => {
    const excerpt = 'x'.repeat(PUBLISHER_EXCERPT_LIMIT + 80)
    expect(normalizePublisherExcerpt(excerpt)).toBe('')
    expect(buildRomanianPublisherSeo('Titlu', excerpt).metaDescription).toBe('')
  })

  it('does not mistake Dr. for a sentence-ending period', () => {
    const sentence =
      'Dr. Ionescu descrie o metodă care îmbunătățește evaluarea clinică bazată pe inteligență artificială și care este destinată personalului medical.'
    const excerpt =
      'Introducere scurtă. ' + sentence + ' Alte detalii '.repeat(45)
    expect(normalizePublisherExcerpt(excerpt, 170)).toBe(
      'Introducere scurtă. ' + sentence,
    )
  })

  it('does not split on Prof. or single-letter initials', () => {
    const sentence =
      'Prof. A. Popescu descrie un sistem de analiză care îi ajută pe experții din laboratoare să înțeleagă mai bine rezultatele unor cercetări recente.'
    expect(
      normalizePublisherExcerpt(sentence + ' Informații '.repeat(33), 160),
    ).toBe(sentence)
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
      expect((source.match(/draft:\s*true/g) ?? []).length)
        .toBeGreaterThanOrEqual(3)
      expect((source.match(/editorialStatus:\s*'review'/g) ?? []).length)
        .toBe(2)
      expect(source).not.toContain('publishedAt:')
    })
  }
})
