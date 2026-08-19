import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
} from 'vitest'

import AuthorCard, {
  getAuthorInitials,
  getAuthorProfileHref,
} from '../../src/components/AuthorCard'

import type {
  PublicAuthorProfile,
} from '../../src/lib/authors'

function fixture(
  overrides: Partial<PublicAuthorProfile> = {},
): PublicAuthorProfile {
  return {
    fullName: 'Ana Popescu',
    slug: 'ana-popescu',
    publicTitle: 'Medic specialist',
    primaryAffiliation: 'Universitatea X',
    shortBio:
      'Autor specializat în utilizarea AI în sănătate.',
    editorialRoles: [
      'author',
      'medicalReviewer',
      'technicalReviewer',
    ],
    robots: 'indexFollow',
    localization: {
      language: 'ro',
      fallbackFields: [],
    },
    ...overrides,
  }
}

describe('AuthorCard', () => {
  it('builds the approved Romanian profile route', () => {
    expect(
      getAuthorProfileHref(
        'ro',
        'ana-popescu',
      ),
    ).toBe('/ro/autori/ana-popescu')
  })

  it('builds the approved English profile route', () => {
    expect(
      getAuthorProfileHref(
        'en',
        'ana-popescu',
      ),
    ).toBe('/en/authors/ana-popescu')
  })

  it('creates stable fallback initials', () => {
    expect(
      getAuthorInitials('Ana Popescu'),
    ).toBe('AP')

    expect(
      getAuthorInitials('Ana Maria Popescu'),
    ).toBe('AP')

    expect(
      getAuthorInitials('Ana'),
    ).toBe('AN')
  })

  it('renders the public Romanian author fields', () => {
    const html = renderToStaticMarkup(
      <AuthorCard
        author={fixture()}
        language="ro"
      />,
    )

    expect(html).toContain('Ana Popescu')
    expect(html).toContain('Medic specialist')
    expect(html).toContain('Universitatea X')
    expect(html).toContain(
      'Autor specializat în utilizarea AI în sănătate.',
    )
    expect(html).toContain('Autor')
    expect(html).toContain(
      'Verificator medical',
    )
    expect(html).toContain(
      '/ro/autori/ana-popescu',
    )
    expect(html).toContain('Vezi profilul')
    expect(html).toContain('AP')
  })

  it('renders English labels and route', () => {
    const html = renderToStaticMarkup(
      <AuthorCard
        author={fixture({
          localization: {
            language: 'en',
            fallbackFields: [],
          },
        })}
        language="en"
      />,
    )

    expect(html).toContain('Author')
    expect(html).toContain('Medical reviewer')
    expect(html).toContain(
      '/en/authors/ana-popescu',
    )
    expect(html).toContain('View profile')
  })

  it('shows at most two editorial roles', () => {
    const html = renderToStaticMarkup(
      <AuthorCard
        author={fixture()}
        language="ro"
      />,
    )

    expect(html).toContain('Autor')
    expect(html).toContain(
      'Verificator medical',
    )
    expect(html).not.toContain(
      'Recenzor tehnic',
    )
  })

  it('works without optional public profile fields', () => {
    const html = renderToStaticMarkup(
      <AuthorCard
        author={fixture({
          publicTitle: undefined,
          primaryAffiliation: undefined,
          shortBio: undefined,
          editorialRoles: [],
        })}
        language="ro"
      />,
    )

    expect(html).toContain('Ana Popescu')
    expect(html).toContain('AP')
    expect(html).toContain('Vezi profilul')
    expect(html).not.toContain(
      'Medic specialist',
    )
    expect(html).not.toContain(
      'Universitatea X',
    )
  })

  it('does not render internal author administration data', () => {
    const html = renderToStaticMarkup(
      <AuthorCard
        author={fixture()}
        language="ro"
      />,
    )

    const forbidden = [
      'verificationStatus',
      'verifiedBy',
      'reviewedBy',
      'publicationConsent',
      'linkedUser',
      'consentNotes',
    ]

    for (const value of forbidden) {
      expect(html).not.toContain(value)
    }
  })
})
