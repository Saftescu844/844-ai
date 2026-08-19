import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  PublicAuthorProfile,
} from '../../src/lib/authors'
import {
  buildPublicAuthorMetadata,
  getAuthorAlternateHrefs,
  getAuthorProfileHref,
} from '../../src/lib/authors-page'

function fixture(
  overrides: Partial<PublicAuthorProfile> = {},
): PublicAuthorProfile {
  return {
    fullName: 'Ana Popescu',
    slug: 'ana-popescu',
    publicTitle: 'Medic specialist',
    shortBio: 'Biografie publică.',
    editorialRoles: ['author'],
    robots: 'indexFollow',
    localization: {
      language: 'ro',
      fallbackFields: [],
    },
    ...overrides,
  }
}

describe('public author page contract', () => {
  it('builds the approved localized routes', () => {
    expect(
      getAuthorProfileHref(
        'ro',
        'ana-popescu',
      ),
    ).toBe('/ro/autori/ana-popescu')

    expect(
      getAuthorProfileHref(
        'en',
        'ana-popescu',
      ),
    ).toBe('/en/authors/ana-popescu')
  })

  it('builds both alternate-language routes from the same technical slug', () => {
    expect(
      getAuthorAlternateHrefs(
        'ana-popescu',
      ),
    ).toEqual({
      ro: '/ro/autori/ana-popescu',
      en: '/en/authors/ana-popescu',
    })
  })

  it('prefers explicit author SEO metadata', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture({
          metaTitle: 'Titlu SEO',
          metaDescription:
            'Descriere SEO.',
        }),
        'ro',
      )

    expect(metadata.title).toBe(
      'Titlu SEO',
    )

    expect(metadata.description).toBe(
      'Descriere SEO.',
    )
  })

  it('falls back to approved public profile fields for metadata', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture({
          metaTitle: undefined,
          metaDescription: undefined,
        }),
        'ro',
      )

    expect(metadata.title).toBe(
      'Ana Popescu — Medic specialist',
    )

    expect(metadata.description).toBe(
      'Biografie publică.',
    )
  })

  it('publishes canonical and hreflang for both approved routes', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture(),
        'en',
      )

    expect(metadata.alternates).toEqual({
      canonical:
        '/en/authors/ana-popescu',
      languages: {
        ro: '/ro/autori/ana-popescu',
        en: '/en/authors/ana-popescu',
      },
    })
  })

  it('maps indexFollow robots safely', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture({
          robots: 'indexFollow',
        }),
        'ro',
      )

    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
    })
  })

  it('maps noindexFollow robots safely', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture({
          robots: 'noindexFollow',
        }),
        'ro',
      )

    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
    })
  })

  it('maps noindexNofollow robots safely', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture({
          robots: 'noindexNofollow',
        }),
        'ro',
      )

    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('keeps English canonical metadata even when profile fields came from Romanian fallback', () => {
    const metadata =
      buildPublicAuthorMetadata(
        fixture({
          localization: {
            language: 'en',
            fallbackFrom: 'ro',
            fallbackFields: [
              'publicTitle',
              'shortBio',
            ],
          },
        }),
        'en',
      )

    expect(metadata.alternates).toMatchObject({
      canonical:
        '/en/authors/ana-popescu',
    })

    expect(metadata.openGraph).toMatchObject({
      url: '/en/authors/ana-popescu',
      locale: 'en_US',
    })
  })
})
