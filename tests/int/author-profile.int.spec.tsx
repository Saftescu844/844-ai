import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
} from 'vitest'

import AuthorProfile from '../../src/components/AuthorProfile'
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
    shortBio: 'Biografie scurtă.',
    platformRoleDescription:
      'Autor editorial în domeniul sănătății.',
    editorialRoles: [
      'author',
      'medicalReviewer',
    ],
    expertiseAreas: [
      {
        name: 'Imagistică medicală',
        description: 'Diagnostic asistat.',
      },
    ],
    credentials: [
      {
        credentialType:
          'academicDegree',
        title: 'Doctor în medicină',
        institution: 'Universitatea X',
        yearObtained: 2020,
      },
    ],
    conflictOfInterestStatement:
      'Nu sunt declarate conflicte.',
    aiUseDisclosure:
      'AI este utilizată pentru suport editorial.',
    website:
      'https://example.com',
    lastReviewedAt:
      '2026-08-19T00:00:00.000Z',
    robots: 'indexFollow',
    localization: {
      language: 'ro',
      fallbackFields: [],
    },
    ...overrides,
  }
}

describe('AuthorProfile', () => {
  it('renders the approved public Romanian profile fields', () => {
    const html = renderToStaticMarkup(
      <AuthorProfile
        author={fixture()}
        language="ro"
      />,
    )

    expect(html).toContain('Ana Popescu')
    expect(html).toContain(
      'Medic specialist',
    )
    expect(html).toContain(
      'Universitatea X',
    )
    expect(html).toContain(
      'Imagistică medicală',
    )
    expect(html).toContain(
      'Doctor în medicină',
    )
    expect(html).toContain(
      'Nu sunt declarate conflicte.',
    )
    expect(html).toContain(
      'AI este utilizată pentru suport editorial.',
    )
    expect(html).toContain(
      'https://example.com',
    )
  })

  it('uses the short biography when extended biography is absent', () => {
    const html = renderToStaticMarkup(
      <AuthorProfile
        author={fixture({
          biography: undefined,
          shortBio:
            'Biografie fallback.',
        })}
        language="ro"
      />,
    )

    expect(html).toContain(
      'Biografie fallback.',
    )
  })

  it('renders only sections that contain valid public data', () => {
    const html = renderToStaticMarkup(
      <AuthorProfile
        author={fixture({
          expertiseAreas: undefined,
          credentials: undefined,
          conflictOfInterestStatement:
            undefined,
          aiUseDisclosure: undefined,
          affiliationsAndSponsorships:
            undefined,
          website: undefined,
          institutionalProfile: undefined,
          orcidUrl: undefined,
          publicEmail: undefined,
          socialLinks: undefined,
          lastReviewedAt: undefined,
        })}
        language="ro"
      />,
    )

    expect(html).not.toContain(
      'Domenii de expertiză',
    )
    expect(html).not.toContain(
      'Calificări publice verificate',
    )
    expect(html).not.toContain(
      'Transparență',
    )
    expect(html).not.toContain(
      'Linkuri profesionale',
    )
  })

  it('shows the English fallback notice only when Romanian fields were actually used', () => {
    const withFallback =
      renderToStaticMarkup(
        <AuthorProfile
          author={fixture({
            localization: {
              language: 'en',
              fallbackFrom: 'ro',
              fallbackFields: [
                'shortBio',
              ],
            },
          })}
          language="en"
        />,
      )

    expect(withFallback).toContain(
      'temporarily shown in Romanian',
    )

    const withoutFallback =
      renderToStaticMarkup(
        <AuthorProfile
          author={fixture({
            localization: {
              language: 'en',
              fallbackFields: [],
            },
          })}
          language="en"
        />,
      )

    expect(withoutFallback).not.toContain(
      'temporarily shown in Romanian',
    )
  })

  it('renders English section labels', () => {
    const html = renderToStaticMarkup(
      <AuthorProfile
        author={fixture()}
        language="en"
      />,
    )

    expect(html).toContain(
      'Areas of expertise',
    )
    expect(html).toContain(
      'Verified public credentials',
    )
    expect(html).toContain(
      'Transparency',
    )
    expect(html).toContain(
      'Professional links',
    )
  })

  it('never renders internal Payload administration fields', () => {
    const html = renderToStaticMarkup(
      <AuthorProfile
        author={fixture()}
        language="ro"
      />,
    )

    const forbidden = [
      'verificationStatus',
      'verificationNotes',
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
