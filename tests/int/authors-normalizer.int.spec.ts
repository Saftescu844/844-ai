import {
  describe,
  expect,
  it,
} from 'vitest'

import type { Autori } from '../../src/payload-types'
import {
  normalizePublicAuthorProfile,
} from '../../src/lib/authors'

function fixture(
  overrides: Partial<Autori> = {},
): Autori {
  return {
    id: 1,
    fullName: 'Dr. Ana Popescu',
    slug: 'ana-popescu',
    editorialRoles: ['author'],
    verificationStatus: 'verified',
    publicationConsent: true,
    status: 'published',
    robots: 'indexFollow',
    updatedAt: '2026-08-19T08:00:00.000Z',
    createdAt: '2026-08-18T08:00:00.000Z',
    ...overrides,
  }
}

function normalize(
  overrides: Partial<Autori> = {},
) {
  return normalizePublicAuthorProfile(
    fixture(overrides),
    {
      language: 'ro',
    },
  )
}

describe('public author normalizer', () => {
  it('normalizes a minimal published profile', () => {
    const result = normalize({
      fullName: '  Dr. Ana Popescu  ',
      slug: '  ana-popescu  ',
    })

    expect(result).toEqual({
      fullName: 'Dr. Ana Popescu',
      slug: 'ana-popescu',
      editorialRoles: ['author'],
      robots: 'indexFollow',
      localization: {
        language: 'ro',
        fallbackFields: [],
      },
    })
  })

  it.each([
    'draft',
    'pendingVerification',
    'verified',
    'inactive',
    'archived',
  ] as const)(
    'rejects a profile with lifecycle status %s',
    (status) => {
      expect(normalize({ status })).toBeNull()
    },
  )

  it('rejects a profile without publication consent', () => {
    expect(
      normalize({
        publicationConsent: false,
      }),
    ).toBeNull()
  })

  it('rejects a profile after consent withdrawal', () => {
    expect(
      normalize({
        consentWithdrawnAt:
          '2026-08-19T09:00:00.000Z',
      }),
    ).toBeNull()
  })

  it('rejects a profile without a valid public name or slug', () => {
    expect(
      normalize({
        fullName: '   ',
      }),
    ).toBeNull()

    expect(
      normalize({
        slug: '   ',
      }),
    ).toBeNull()
  })

  it('does not expose contact data without public contact consent', () => {
    const result = normalize({
      publicContactConsent: false,
      publicEmail: 'public@example.com',
      website: 'https://example.com',
      institutionalProfile:
        'https://institution.example.com',
      orcidUrl:
        'https://orcid.org/0000-0001-2345-6789',
      socialLinks: [
        {
          platform: 'linkedin',
          url: 'https://linkedin.com/in/example',
          enabled: true,
        },
      ],
    })

    expect(result).not.toBeNull()

    if (!result) return

    expect(result).not.toHaveProperty(
      'publicEmail',
    )
    expect(result).not.toHaveProperty('website')
    expect(result).not.toHaveProperty(
      'institutionalProfile',
    )
    expect(result).not.toHaveProperty('orcidUrl')
    expect(result).not.toHaveProperty(
      'socialLinks',
    )
  })

  it('exposes only safe contact links when consent is present', () => {
    const result = normalize({
      publicContactConsent: true,
      publicEmail: ' public@example.com ',
      website: 'https://example.com/profile',
      institutionalProfile:
        'http://institution.example.com/profile',
      orcidUrl: 'javascript:alert(1)',
      socialLinks: [
        {
          platform: 'linkedin',
          label: ' LinkedIn ',
          url: 'https://linkedin.com/in/example',
          enabled: true,
          order: 20,
        },
        {
          platform: 'github',
          url: 'http://github.com/example',
          enabled: true,
          order: 10,
        },
        {
          platform: 'youtube',
          url: 'https://youtube.com/@example',
          enabled: false,
          order: 5,
        },
      ],
    })

    expect(result).not.toBeNull()

    if (!result) return

    expect(result.publicEmail).toBe(
      'public@example.com',
    )
    expect(result.website).toBe(
      'https://example.com/profile',
    )

    expect(result).not.toHaveProperty(
      'institutionalProfile',
    )
    expect(result).not.toHaveProperty('orcidUrl')

    expect(result.socialLinks).toEqual([
      {
        platform: 'linkedin',
        label: 'LinkedIn',
        url: 'https://linkedin.com/in/example',
      },
    ])
  })

  it('publishes only verified and explicitly public credentials', () => {
    const result = normalize({
      credentials: [
        {
          credentialType: 'academicDegree',
          title: ' Doctor în medicină ',
          institution: ' UMF București ',
          country: ' România ',
          yearObtained: 2018,
          publiclyVisible: true,
          verified: true,
          identifier: 'PRIVATE-ID',
          verificationUrl:
            'https://internal.example.com',
          verifiedAt:
            '2026-08-01T00:00:00.000Z',
          order: 20,
          id: 'credential-public',
        },
        {
          credentialType: 'certification',
          title: 'Neverificată',
          publiclyVisible: true,
          verified: false,
          order: 10,
        },
        {
          credentialType: 'training',
          title: 'Privată',
          publiclyVisible: false,
          verified: true,
          order: 5,
        },
      ],
    })

    expect(result).not.toBeNull()

    if (!result) return

    expect(result.credentials).toEqual([
      {
        credentialType: 'academicDegree',
        title: 'Doctor în medicină',
        institution: 'UMF București',
        country: 'România',
        yearObtained: 2018,
      },
    ])

    expect(
      JSON.stringify(result.credentials),
    ).not.toContain('PRIVATE-ID')

    expect(
      JSON.stringify(result.credentials),
    ).not.toContain('verificationUrl')

    expect(
      JSON.stringify(result.credentials),
    ).not.toContain('verifiedAt')
  })

  it('publishes only verified and public professional identifiers', () => {
    const result = normalize({
      professionalIdentifiers: [
        {
          type: 'orcid',
          value: '0000-0001-2345-6789',
          publiclyVisible: true,
          verified: true,
          verificationUrl:
            'https://internal.example.com/orcid',
          id: 'identifier-public',
        },
        {
          type: 'researcherId',
          value: 'PRIVATE',
          publiclyVisible: false,
          verified: true,
        },
        {
          type: 'professionalRegistry',
          value: 'UNVERIFIED',
          publiclyVisible: true,
          verified: false,
        },
      ],
    })

    expect(result).not.toBeNull()

    if (!result) return

    expect(
      result.professionalIdentifiers,
    ).toEqual([
      {
        type: 'orcid',
        value: '0000-0001-2345-6789',
      },
    ])

    expect(
      JSON.stringify(
        result.professionalIdentifiers,
      ),
    ).not.toContain('verificationUrl')
  })

  it('publishes only verified expertise and removes internal flags', () => {
    const result = normalize({
      expertiseAreas: [
        {
          name: ' Imagistică medicală ',
          description: ' Diagnostic asistat ',
          verified: true,
          order: 20,
          id: 'expertise-public',
        },
        {
          name: 'Neverificată',
          verified: false,
          order: 10,
        },
      ],
    })

    expect(result).not.toBeNull()

    if (!result) return

    expect(result.expertiseAreas).toEqual([
      {
        name: 'Imagistică medicală',
        description: 'Diagnostic asistat',
      },
    ])

    expect(
      JSON.stringify(result.expertiseAreas),
    ).not.toContain('verified')

    expect(
      JSON.stringify(result.expertiseAreas),
    ).not.toContain('expertise-public')
  })

  it('publishes only verified and public transparency relationships', () => {
    const result = normalize({
      affiliationsAndSponsorships: [
        {
          organization: ' Universitatea X ',
          relationshipType: 'employment',
          description: ' Cadru didactic ',
          currentlyActive: true,
          publiclyVisible: true,
          verified: true,
          id: 'affiliation-public',
        },
        {
          organization: 'Private Company',
          relationshipType: 'consulting',
          publiclyVisible: false,
          verified: true,
        },
        {
          organization: 'Unverified Company',
          relationshipType: 'sponsorship',
          publiclyVisible: true,
          verified: false,
        },
      ],
    })

    expect(result).not.toBeNull()

    if (!result) return

    expect(
      result.affiliationsAndSponsorships,
    ).toEqual([
      {
        organization: 'Universitatea X',
        relationshipType: 'employment',
        description: 'Cadru didactic',
        currentlyActive: true,
      },
    ])

    const serialized = JSON.stringify(
      result.affiliationsAndSponsorships,
    )

    expect(serialized).not.toContain('verified')
    expect(serialized).not.toContain(
      'publiclyVisible',
    )
    expect(serialized).not.toContain(
      'affiliation-public',
    )
  })

  it('only exposes medical review scope for a currently verified medical reviewer', () => {
    const hidden = normalize({
      isMedicalReviewer: false,
      medicalReviewScope: 'Cardiologie',
    })

    const visible = normalize({
      isMedicalReviewer: true,
      medicalReviewScope: ' Cardiologie ',
      credentials: [
        {
          credentialType: 'medicalLicense',
          title: 'Medic specialist',
          verified: true,
          yearExpires: new Date().getUTCFullYear(),
        },
      ],
    })

    expect(hidden).not.toBeNull()
    expect(visible).not.toBeNull()

    expect(hidden).not.toHaveProperty(
      'medicalReviewScope',
    )

    expect(visible?.medicalReviewScope).toBe(
      'Cardiologie',
    )
  })

  it('suppresses expired medical-review claims from the public profile', () => {
    const currentYear = new Date().getUTCFullYear()

    const result = normalize({
      editorialRoles: [
        'author',
        'medicalReviewer',
      ],
      isMedicalReviewer: true,
      medicalReviewScope: 'Cardiologie',
      credentials: [
        {
          credentialType: 'medicalLicense',
          title: 'Medic specialist',
          publiclyVisible: true,
          verified: true,
          yearExpires: currentYear - 1,
        },
      ],
    })

    expect(result).not.toBeNull()

    expect(result?.editorialRoles).toEqual([
      'author',
    ])

    expect(result).not.toHaveProperty(
      'medicalReviewScope',
    )

    expect(result).not.toHaveProperty(
      'credentials',
    )
  })

  it('suppresses medical-review claims when professional verification is past due', () => {
    const currentYear = new Date().getUTCFullYear()

    const result = normalize({
      editorialRoles: [
        'author',
        'medicalReviewer',
      ],
      isMedicalReviewer: true,
      medicalReviewScope: 'Cardiologie',
      nextVerificationDue:
        '2000-01-01T00:00:00.000Z',
      credentials: [
        {
          credentialType: 'medicalLicense',
          title: 'Medic specialist',
          publiclyVisible: true,
          verified: true,
          yearExpires: currentYear + 1,
        },
      ],
    })

    expect(result).not.toBeNull()

    expect(result?.editorialRoles).toEqual([
      'author',
    ])

    expect(result).not.toHaveProperty(
      'medicalReviewScope',
    )
  })

  it('suppresses the medical-review role when the required public review scope is missing', () => {
    const currentYear = new Date().getUTCFullYear()

    const result = normalize({
      editorialRoles: [
        'author',
        'medicalReviewer',
      ],
      isMedicalReviewer: false,
      credentials: [
        {
          credentialType: 'medicalLicense',
          title: 'Medic specialist',
          verified: true,
          yearExpires: currentYear,
        },
      ],
    })

    expect(result).not.toBeNull()

    expect(result?.editorialRoles).toEqual([
      'author',
    ])

    expect(result).not.toHaveProperty(
      'medicalReviewScope',
    )
  })

  it('tracks explicit localization fallback metadata without inventing translations', () => {
    const result = normalizePublicAuthorProfile(
      fixture(),
      {
        language: 'en',
        fallbackFrom: 'ro',
        fallbackFields: [
          ' shortBio ',
          'shortBio',
          'publicTitle',
          '',
        ],
      },
    )

    expect(result).not.toBeNull()

    expect(result?.localization).toEqual({
      language: 'en',
      fallbackFrom: 'ro',
      fallbackFields: [
        'shortBio',
        'publicTitle',
      ],
    })
  })

  it('does not report a fallback source when no fallback field was used', () => {
    const result = normalizePublicAuthorProfile(
      fixture(),
      {
        language: 'en',
        fallbackFrom: 'ro',
        fallbackFields: [],
      },
    )

    expect(result).not.toBeNull()

    expect(result?.localization).toEqual({
      language: 'en',
      fallbackFields: [],
    })
  })

  it('never exposes internal author administration fields', () => {
    const result = normalize({
      verificationStatus: 'verified',
      verifiedAt:
        '2026-08-01T00:00:00.000Z',
      verifiedBy: 1,
      verificationSource: 'internal',
      nextVerificationDue:
        '2027-08-01T00:00:00.000Z',
      verificationNotes: 'PRIVATE NOTES',
      documentsReviewed: true,

      publicationConsent: true,
      consentConfirmedAt:
        '2026-08-01T00:00:00.000Z',
      consentConfirmedBy: 1,
      consentScope: 'PRIVATE SCOPE',
      profileImageConsent: true,
      publicContactConsent: false,
      consentNotes: 'PRIVATE CONSENT NOTES',

      nextReviewDue:
        '2027-08-01T00:00:00.000Z',
      inactiveAt: null,
      archivedAt: null,
      reviewedBy: 1,
      archivalReason: 'PRIVATE REASON',
      linkedUser: 1,
    })

    expect(result).not.toBeNull()

    if (!result) return

    const forbidden = [
      'id',
      'verificationStatus',
      'verifiedAt',
      'verifiedBy',
      'verificationSource',
      'nextVerificationDue',
      'verificationNotes',
      'documentsReviewed',
      'publicationConsent',
      'consentConfirmedAt',
      'consentConfirmedBy',
      'consentScope',
      'profileImageConsent',
      'publicContactConsent',
      'consentWithdrawnAt',
      'consentNotes',
      'nextReviewDue',
      'inactiveAt',
      'archivedAt',
      'reviewedBy',
      'archivalReason',
      'linkedUser',
      'createdAt',
      'updatedAt',
      'isMedicalReviewer',
    ]

    for (const field of forbidden) {
      expect(result).not.toHaveProperty(field)
    }

    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain(
      'PRIVATE NOTES',
    )
    expect(serialized).not.toContain(
      'PRIVATE SCOPE',
    )
    expect(serialized).not.toContain(
      'PRIVATE CONSENT NOTES',
    )
    expect(serialized).not.toContain(
      'PRIVATE REASON',
    )
  })

  it('does not mutate the original Payload document', () => {
    const author = fixture({
      credentials: [
        {
          credentialType: 'certification',
          title: 'Certificare',
          publiclyVisible: true,
          verified: true,
          order: 2,
        },
      ],
      socialLinks: [
        {
          platform: 'linkedin',
          url: 'https://linkedin.com/in/example',
          enabled: true,
          order: 1,
        },
      ],
      publicContactConsent: true,
    })

    const before = JSON.stringify(author)

    normalizePublicAuthorProfile(author, {
      language: 'ro',
    })

    expect(JSON.stringify(author)).toBe(before)
  })
})
