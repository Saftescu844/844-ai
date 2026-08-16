import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  type RankableSearchResult,
  rankSearchResults,
} from '../../src/search/rankSearchResults'

function fixture(
  id: number,
  title: string,
  excerpt = '',
  publishedAt = '2026-01-01T00:00:00.000Z',
): RankableSearchResult {
  return {
    id,
    title,
    excerpt,
    publishedAt,
  }
}

describe('search relevance', () => {
  it('ranks an exact normalized title above a containing title', () => {
    const exact = fixture(
      1,
      'Inteligența artificială',
      '',
      '2025-01-01T00:00:00.000Z',
    )

    const containing = fixture(
      2,
      'Viitorul inteligenței artificiale',
      '',
      '2026-01-01T00:00:00.000Z',
    )

    const ranked = rankSearchResults(
      [containing, exact],
      'INTELIGENTA ARTIFICIALA',
      ['inteligenta', 'artificiala'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      1,
      2,
    ])
  })

  it('ranks a complete title phrase above scattered title tokens', () => {
    const phrase = fixture(
      1,
      'Ghid despre inteligență artificială pentru medici',
    )

    const scattered = fixture(
      2,
      'Inteligență clinică și utilizare artificială',
      '',
      '2026-06-01T00:00:00.000Z',
    )

    const ranked = rankSearchResults(
      [scattered, phrase],
      'inteligență artificială',
      ['inteligenta', 'artificiala'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      1,
      2,
    ])
  })

  it('prefers more query tokens in the title before excerpt relevance', () => {
    const titleHeavy = fixture(
      1,
      'Inteligență pentru sisteme cu utilizare artificială',
    )

    const excerptHeavy = fixture(
      2,
      'Inteligență în medicină',
      'Un ghid despre inteligență artificială.',
      '2026-06-01T00:00:00.000Z',
    )

    const ranked = rankSearchResults(
      [excerptHeavy, titleHeavy],
      'inteligență artificială',
      ['inteligenta', 'artificiala'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      1,
      2,
    ])
  })

  it('ranks a complete excerpt phrase above scattered excerpt tokens', () => {
    const phrase = fixture(
      1,
      'Ghid medical',
      'Sisteme de inteligență artificială în clinică.',
    )

    const scattered = fixture(
      2,
      'Alt ghid medical',
      'Inteligență clinică și sisteme cu utilizare artificială.',
      '2026-06-01T00:00:00.000Z',
    )

    const ranked = rankSearchResults(
      [scattered, phrase],
      'inteligență artificială',
      ['inteligenta', 'artificiala'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      1,
      2,
    ])
  })

  it('ranks an excerpt match above a fallback-only candidate', () => {
    const excerptMatch = fixture(
      1,
      'Ghid clinic',
      'Inteligența artificială poate sprijini medicii.',
    )

    const fallbackOnly = fixture(
      2,
      'Ghid tehnic',
      'Introducere generală.',
      '2026-06-01T00:00:00.000Z',
    )

    const ranked = rankSearchResults(
      [fallbackOnly, excerptMatch],
      'inteligență artificială',
      ['inteligenta', 'artificiala'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      1,
      2,
    ])
  })

  it('uses publication date as the relevance tie-breaker', () => {
    const older = fixture(
      1,
      'AI în sănătate',
      '',
      '2025-01-01T00:00:00.000Z',
    )

    const newer = fixture(
      2,
      'AI în educație',
      '',
      '2026-01-01T00:00:00.000Z',
    )

    const ranked = rankSearchResults(
      [older, newer],
      'ai',
      ['ai'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      2,
      1,
    ])
  })

  it('uses id as a deterministic final tie-breaker', () => {
    const first = fixture(7, 'AI medical')
    const second = fixture(3, 'AI educațional')

    const ranked = rankSearchResults(
      [first, second],
      'ai',
      ['ai'],
    )

    expect(ranked.map((doc) => doc.id)).toEqual([
      3,
      7,
    ])
  })

  it('does not mutate the original result array', () => {
    const first = fixture(
      1,
      'AI vechi',
      '',
      '2025-01-01T00:00:00.000Z',
    )

    const second = fixture(
      2,
      'AI nou',
      '',
      '2026-01-01T00:00:00.000Z',
    )

    const original = [first, second]
    const before = [...original]

    rankSearchResults(original, 'ai', ['ai'])

    expect(original).toEqual(before)
  })
})
