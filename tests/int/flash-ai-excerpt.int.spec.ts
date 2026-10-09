import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashAiExcerptFromVerifiedParagraphs,
} from '@/lib/flash/ingestion/flashAiVerifiedExcerpt'

describe('verified FlashAI excerpt (RO/EN)', () => {
  it.each([
    [
      'ro',
      'Cercetătorii descriu un rezultat verificat care necesită revizuire editorială înainte de publicare. ',
    ],
    [
      'en',
      'Researchers describe a verified result that requires editorial review before publication. ',
    ],
  ])('extracts a complete grounded sentence in %s', (_language, sentence) => {
    const editorial = sentence.repeat(10)
    const excerpt = buildFlashAiExcerptFromVerifiedParagraphs([
      editorial,
    ])

    expect(excerpt.length).toBeGreaterThanOrEqual(180)
    expect(excerpt.length).toBeLessThanOrEqual(300)
    expect(editorial.startsWith(excerpt)).toBe(true)
    expect(excerpt.endsWith('.')).toBe(true)
  })

  it('uses a safe word boundary if no complete sentence fits', () => {
    const verified = Array.from({ length: 100 }, () => 'analiză')
      .join(' ')
    const excerpt = buildFlashAiExcerptFromVerifiedParagraphs([verified])
    expect(excerpt.length).toBeGreaterThanOrEqual(180)
    expect(excerpt.length).toBeLessThanOrEqual(300)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(verified.startsWith(excerpt.slice(0, -1))).toBe(true)
  })

  it('can combine short verified paragraphs without inventing words', () => {
    const paragraphs = [
      'Prima propoziție confirmată.',
      Array.from({ length: 40 }, () => 'informație').join(' '),
    ]
    const excerpt = buildFlashAiExcerptFromVerifiedParagraphs(paragraphs)
    expect(paragraphs.join(' ').startsWith(excerpt.slice(0, -1))).toBe(true)
    expect(excerpt.length).toBeGreaterThanOrEqual(180)
    expect(excerpt.length).toBeLessThanOrEqual(300)
  })

  it('fails closed for insufficient content or missing word boundaries', () => {
    expect(() =>
      buildFlashAiExcerptFromVerifiedParagraphs(['scurt']),
    ).toThrow('too short')

    expect(() =>
      buildFlashAiExcerptFromVerifiedParagraphs(['x'.repeat(500)]),
    ).toThrow('no safe excerpt word boundary')
  })
})
