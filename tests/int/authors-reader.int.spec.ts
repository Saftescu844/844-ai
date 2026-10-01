import type { Payload } from 'payload'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { payloadClient } from '@/lib/payload'

vi.mock('@/lib/payload', () => ({
  payloadClient: vi.fn(),
}))

import {
  PUBLIC_AUTHOR_SELECT,
  getPublicAuthor,
  getPublicAuthorByID,
  getPublicAuthorInLocale,
} from '../../src/lib/authors-reader'

const findMock = vi.fn()
const findByIDMock = vi.fn()

function mockPayload() {
  vi.mocked(payloadClient).mockResolvedValue({
    find: findMock,
    findByID: findByIDMock,
  } as unknown as Payload)
}

function mockDocs(docs: unknown[]) {
  findMock.mockResolvedValue({
    docs,
  })
}

function selectedAuthor(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 99,
    fullName: 'Dr. Ana Popescu',
    slug: 'ana-popescu',
    editorialRoles: ['author'],
    publicationConsent: true,
    publicContactConsent: false,
    consentWithdrawnAt: null,
    status: 'published',
    robots: 'indexFollow',
    ...overrides,
  }
}

describe('public author reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPayload()
    mockDocs([])
    findByIDMock.mockResolvedValue(null)
  })

  it('rejects an invalid slug before initializing Payload', async () => {
    const result =
      await getPublicAuthorInLocale(
        '../private-author',
        'ro',
      )

    expect(result).toBeNull()
    expect(payloadClient).not.toHaveBeenCalled()
    expect(findMock).not.toHaveBeenCalled()
  })

  it('uses the exact safe query contract for Romanian', async () => {
    const result =
      await getPublicAuthorInLocale(
        'ana-popescu',
        'ro',
      )

    expect(result).toBeNull()

    expect(payloadClient).toHaveBeenCalledTimes(1)
    expect(findMock).toHaveBeenCalledTimes(1)

    expect(findMock).toHaveBeenCalledWith({
      collection: 'autori',
      locale: 'ro',
      fallbackLocale: false,
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            slug: {
              equals: 'ana-popescu',
            },
          },
          {
            status: {
              equals: 'published',
            },
          },
        ],
      },
      select: PUBLIC_AUTHOR_SELECT,
    })
  })

  it('uses the requested English locale without automatic Payload fallback', async () => {
    await getPublicAuthorInLocale(
      'ana-popescu',
      'en',
    )

    const query = findMock.mock.calls[0]?.[0]

    expect(query).toMatchObject({
      collection: 'autori',
      locale: 'en',
      fallbackLocale: false,
      overrideAccess: true,
      depth: 0,
      limit: 1,
    })
  })

  it('returns null when Payload finds no published author', async () => {
    const result =
      await getPublicAuthorInLocale(
        'autor-inexistent',
        'ro',
      )

    expect(result).toBeNull()
  })

  it('normalizes a selected published author instead of returning the Payload document', async () => {
    mockDocs([
      selectedAuthor({
        fullName: ' Dr. Ana Popescu ',
        publicTitle: ' Medic ',
        verificationStatus: 'verified',
        createdAt:
          '2026-08-01T00:00:00.000Z',
        updatedAt:
          '2026-08-19T00:00:00.000Z',
      }),
    ])

    const result =
      await getPublicAuthorInLocale(
        'ana-popescu',
        'ro',
      )

    expect(result).toEqual({
      fullName: 'Dr. Ana Popescu',
      slug: 'ana-popescu',
      publicTitle: 'Medic',
      editorialRoles: ['author'],
      robots: 'indexFollow',
      localization: {
        language: 'ro',
        fallbackFields: [],
      },
    })

    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty(
      'verificationStatus',
    )
    expect(result).not.toHaveProperty(
      'publicationConsent',
    )
    expect(result).not.toHaveProperty(
      'createdAt',
    )
    expect(result).not.toHaveProperty(
      'updatedAt',
    )
  })

  it('does not select forbidden administrative or relationship fields', () => {
    const select =
      PUBLIC_AUTHOR_SELECT as Record<
        string,
        unknown
      >

    const forbiddenTopLevel = [
      'linkedUser',
      'reviewedBy',
      'verifiedBy',
      'verificationStatus',
      'verificationSource',
      'verificationNotes',
      'documentsReviewed',
      'consentConfirmedAt',
      'consentConfirmedBy',
      'consentScope',
      'profileImageConsent',
      'consentNotes',
      'nextReviewDue',
      'inactiveAt',
      'archivedAt',
      'archivalReason',
      'createdAt',
      'updatedAt',
    ]

    for (const field of forbiddenTopLevel) {
      expect(select).not.toHaveProperty(field)
    }

    expect(select.credentials).not.toHaveProperty(
      'identifier',
    )
    expect(select.credentials).not.toHaveProperty(
      'verificationUrl',
    )
    expect(select.credentials).not.toHaveProperty(
      'verifiedAt',
    )

    expect(
      select.professionalIdentifiers,
    ).not.toHaveProperty('verificationUrl')
  })

  it('exposes only safe approved profile-image fields', async () => {
    mockDocs([
      selectedAuthor({
        profileImage: 10,
      }),
    ])

    findByIDMock.mockResolvedValue({
      id: 10,
      url: 'https://media.example.com/ana.jpg',
      alt: 'Dr. Ana Popescu',
      credit: 'Foto: Instituția X',
      sursaImagine: 'alta',
      dreptUtilizareConfirmat: true,
      hashMD5: 'internal-secret-hash',
    })

    const result =
      await getPublicAuthorInLocale(
        'ana-popescu',
        'ro',
      )

    expect(result?.profileImage).toEqual({
      url: 'https://media.example.com/ana.jpg',
      alt: 'Dr. Ana Popescu',
      credit: 'Foto: Instituția X',
    })

    expect(result?.profileImage).not.toHaveProperty(
      'hashMD5',
    )
    expect(result?.profileImage).not.toHaveProperty(
      'dreptUtilizareConfirmat',
    )

    expect(findByIDMock).toHaveBeenCalledWith({
      collection: 'media',
      id: 10,
      locale: 'ro',
      fallbackLocale: false,
      overrideAccess: true,
      depth: 0,
      disableErrors: true,
      select: {
        url: true,
        alt: true,
        credit: true,
        sursaImagine: true,
        dreptUtilizareConfirmat: true,
      },
    })
  })

  it('suppresses profile images when Media rights are no longer confirmed', async () => {
    mockDocs([
      selectedAuthor({
        profileImage: 10,
      }),
    ])

    findByIDMock.mockResolvedValue({
      id: 10,
      url: 'https://media.example.com/ana.jpg',
      alt: 'Dr. Ana Popescu',
      sursaImagine: 'proprie',
      dreptUtilizareConfirmat: false,
    })

    const result =
      await getPublicAuthorInLocale(
        'ana-popescu',
        'ro',
      )

    expect(result).not.toBeNull()
    expect(result).not.toHaveProperty(
      'profileImage',
    )
  })

  it('rejects an invalid author ID before initializing Payload', async () => {
    const result =
      await getPublicAuthorByID(
        0,
        'ro',
      )

    expect(result).toBeNull()
    expect(payloadClient).not.toHaveBeenCalled()
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('resolves an author ID through the same safe public contract', async () => {
    findByIDMock.mockResolvedValue(
      selectedAuthor({
        fullName: ' Redacția 844 AI ',
        slug: 'redactia-844-ai',
        profileType: 'editorialSystem',
        shortBio: ' Identitate editorială ',
      }),
    )

    const result =
      await getPublicAuthorByID(
        99,
        'ro',
      )

    expect(findByIDMock).toHaveBeenCalledWith({
      collection: 'autori',
      id: 99,
      locale: 'ro',
      fallbackLocale: false,
      overrideAccess: true,
      depth: 0,
      disableErrors: true,
      select: PUBLIC_AUTHOR_SELECT,
    })

    expect(result).toEqual({
      fullName: 'Redacția 844 AI',
      slug: 'redactia-844-ai',
      shortBio: 'Identitate editorială',
      editorialRoles: ['author'],
      robots: 'indexFollow',
      localization: {
        language: 'ro',
        fallbackFields: [],
      },
    })

    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty(
      'publicationConsent',
    )
  })

  it('does not use English as a fallback for Romanian profiles', async () => {
    mockDocs([
      selectedAuthor({
        publicTitle: 'Medic',
      }),
    ])

    const result =
      await getPublicAuthor(
        'ana-popescu',
        'ro',
      )

    expect(result?.publicTitle).toBe('Medic')
    expect(findMock).toHaveBeenCalledTimes(1)
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('loads the Romanian source explicitly and merges missing English localized fields', async () => {
    mockDocs([
      selectedAuthor({
        publicTitle: '',
        shortBio: null,
        expertiseAreas: [
          {
            id: 'expertise-1',
            name: '',
            description: '',
            verified: true,
          },
        ],
      }),
    ])

    findByIDMock.mockResolvedValue(
      selectedAuthor({
        publicTitle: 'Medic specialist',
        shortBio: 'Biografie română',
        expertiseAreas: [
          {
            id: 'expertise-1',
            name: 'Imagistică medicală',
            description:
              'Diagnostic asistat',
            verified: true,
          },
        ],
      }),
    )

    const result =
      await getPublicAuthor(
        'ana-popescu',
        'en',
      )

    expect(findByIDMock).toHaveBeenCalledWith({
      collection: 'autori',
      id: 99,
      locale: 'ro',
      fallbackLocale: false,
      overrideAccess: true,
      depth: 0,
      disableErrors: true,
      select: PUBLIC_AUTHOR_SELECT,
    })

    expect(result).not.toBeNull()

    expect(result?.publicTitle).toBe(
      'Medic specialist',
    )
    expect(result?.shortBio).toBe(
      'Biografie română',
    )

    expect(result?.expertiseAreas).toEqual([
      {
        name: 'Imagistică medicală',
        description: 'Diagnostic asistat',
      },
    ])

    expect(result?.localization).toEqual({
      language: 'en',
      fallbackFrom: 'ro',
      fallbackFields:
        expect.arrayContaining([
          'publicTitle',
          'shortBio',
          'expertiseAreas.name',
          'expertiseAreas.description',
        ]),
    })

    expect(result).not.toHaveProperty('id')
  })

  it('returns the English profile without fallback metadata when the Romanian source is unavailable', async () => {
    mockDocs([
      selectedAuthor({
        publicTitle: 'Medical specialist',
        shortBio: 'English biography',
      }),
    ])

    findByIDMock.mockResolvedValue(null)

    const result =
      await getPublicAuthor(
        'ana-popescu',
        'en',
      )

    expect(result?.publicTitle).toBe(
      'Medical specialist',
    )

    expect(result?.localization).toEqual({
      language: 'en',
      fallbackFields: [],
    })
  })

  it('returns null if the fallback snapshot is no longer publicly valid', async () => {
    mockDocs([
      selectedAuthor({
        shortBio: '',
      }),
    ])

    findByIDMock.mockResolvedValue(
      selectedAuthor({
        shortBio: 'Biografie română',
        status: 'inactive',
      }),
    )

    const result =
      await getPublicAuthor(
        'ana-popescu',
        'en',
      )

    expect(result).toBeNull()
  })
})
