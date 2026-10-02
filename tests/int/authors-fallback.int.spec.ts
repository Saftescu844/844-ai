import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  PublicAuthorSource,
} from '../../src/lib/authors'
import {
  mergeAuthorLocaleFallback,
} from '../../src/lib/authors'

function fixture(
  overrides: Partial<PublicAuthorSource> = {},
): PublicAuthorSource {
  return {
    fullName: 'Ana Popescu',
    slug: 'ana-popescu',
    editorialRoles: ['author'],
    publicationConsent: true,
    publicContactConsent: false,
    status: 'published',
    robots: 'indexFollow',
    ...overrides,
  }
}

describe('author locale fallback merger', () => {
  it('falls back missing top-level localized text from Romanian', () => {
    const en = fixture({
      publicTitle: ' ',
      shortBio: null,
      primaryAffiliation: 'English affiliation',
    })

    const ro = fixture({
      publicTitle: 'Medic specialist',
      shortBio: 'Biografie scurtă',
      primaryAffiliation: 'Afiliere română',
    })

    const result =
      mergeAuthorLocaleFallback(en, ro)

    expect(result.source.publicTitle).toBe(
      'Medic specialist',
    )
    expect(result.source.shortBio).toBe(
      'Biografie scurtă',
    )

    expect(
      result.source.primaryAffiliation,
    ).toBe('English affiliation')

    expect(result.fallbackFields).toEqual([
      'publicTitle',
      'shortBio',
    ])
  })

  it('does not overwrite an existing English translation', () => {
    const en = fixture({
      publicTitle: 'Medical specialist',
      shortBio: 'English biography',
    })

    const ro = fixture({
      publicTitle: 'Medic specialist',
      shortBio: 'Biografie română',
    })

    const result =
      mergeAuthorLocaleFallback(en, ro)

    expect(result.source.publicTitle).toBe(
      'Medical specialist',
    )
    expect(result.source.shortBio).toBe(
      'English biography',
    )
    expect(result.fallbackFields).toEqual([])
  })

  it('falls back biography only when the primary rich text has no content', () => {
    const emptyBiography = {
      root: {
        type: 'root',
        children: [],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }

    const roBiography = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }

    const result =
      mergeAuthorLocaleFallback(
        fixture({
          biography: emptyBiography,
        }),
        fixture({
          biography: roBiography,
        }),
      )

    expect(result.source.biography).toEqual(
      roBiography,
    )

    expect(result.fallbackFields).toContain(
      'biography',
    )
  })

  it('falls back nested localized fields only between rows with the same id', () => {
    const result =
      mergeAuthorLocaleFallback(
        fixture({
          expertiseAreas: [
            {
              id: 'expertise-1',
              name: '',
              description: null,
              verified: true,
            },
          ],
          credentials: [
            {
              id: 'credential-1',
              credentialType: 'academicDegree',
              title: '',
              publiclyVisible: true,
              verified: true,
            },
          ],
          socialLinks: [
            {
              id: 'social-1',
              platform: 'linkedin',
              label: '',
              url: 'https://linkedin.com/example',
              enabled: true,
            },
          ],
          affiliationsAndSponsorships: [
            {
              id: 'affiliation-1',
              organization: 'University',
              relationshipType: 'employment',
              description: '',
              publiclyVisible: true,
              verified: true,
            },
          ],
        }),
        fixture({
          expertiseAreas: [
            {
              id: 'expertise-1',
              name: 'Imagistică medicală',
              description:
                'Diagnostic asistat',
              verified: true,
            },
          ],
          credentials: [
            {
              id: 'credential-1',
              credentialType: 'academicDegree',
              title: 'Doctor în medicină',
              publiclyVisible: true,
              verified: true,
            },
          ],
          socialLinks: [
            {
              id: 'social-1',
              platform: 'linkedin',
              label: 'LinkedIn',
              url: 'https://linkedin.com/example',
              enabled: true,
            },
          ],
          affiliationsAndSponsorships: [
            {
              id: 'affiliation-1',
              organization: 'University',
              relationshipType: 'employment',
              description: 'Cadru didactic',
              publiclyVisible: true,
              verified: true,
            },
          ],
        }),
      )

    expect(
      result.source.expertiseAreas?.[0],
    ).toMatchObject({
      name: 'Imagistică medicală',
      description: 'Diagnostic asistat',
    })

    expect(
      result.source.credentials?.[0]?.title,
    ).toBe('Doctor în medicină')

    expect(
      result.source.socialLinks?.[0]?.label,
    ).toBe('LinkedIn')

    expect(
      result.source
        .affiliationsAndSponsorships?.[0]
        ?.description,
    ).toBe('Cadru didactic')

    expect(result.fallbackFields).toEqual(
      expect.arrayContaining([
        'expertiseAreas.name',
        'expertiseAreas.description',
        'credentials.title',
        'socialLinks.label',
        'affiliationsAndSponsorships.description',
      ]),
    )
  })

  it('does not cross-match localized values between different row ids', () => {
    const result =
      mergeAuthorLocaleFallback(
        fixture({
          credentials: [
            {
              id: 'credential-en',
              credentialType: 'academicDegree',
              title: '',
              publiclyVisible: true,
              verified: true,
            },
          ],
        }),
        fixture({
          credentials: [
            {
              id: 'credential-ro',
              credentialType: 'academicDegree',
              title: 'Titlu românesc',
              publiclyVisible: true,
              verified: true,
            },
          ],
        }),
      )

    expect(
      result.source.credentials?.[0]?.title,
    ).toBe('')

    expect(result.fallbackFields).not.toContain(
      'credentials.title',
    )
  })

  it('falls back the entire localized specialties field only when it is absent', () => {
    const result =
      mergeAuthorLocaleFallback(
        fixture({
          specialties: [],
        }),
        fixture({
          specialties: [
            {
              label: 'Cardiologie',
              description: 'Specialitate',
            },
          ],
        }),
      )

    expect(result.source.specialties).toEqual([
      {
        label: 'Cardiologie',
        description: 'Specialitate',
      },
    ])

    expect(result.fallbackFields).toContain(
      'specialties',
    )
  })

  it('does not mutate either source document', () => {
    const en = fixture({
      publicTitle: '',
      expertiseAreas: [
        {
          id: 'expertise-1',
          name: '',
          verified: true,
        },
      ],
    })

    const ro = fixture({
      publicTitle: 'Medic',
      expertiseAreas: [
        {
          id: 'expertise-1',
          name: 'Medicină',
          verified: true,
        },
      ],
    })

    const enBefore = JSON.stringify(en)
    const roBefore = JSON.stringify(ro)

    mergeAuthorLocaleFallback(en, ro)

    expect(JSON.stringify(en)).toBe(enBefore)
    expect(JSON.stringify(ro)).toBe(roBefore)
  })
})
