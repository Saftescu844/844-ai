import {
  renderToStaticMarkup,
} from 'react-dom/server'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  PublicAuthorProfile,
} from '../../src/lib/authors'

const {
  getPublicAuthorMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getPublicAuthorMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('@/lib/authors-reader', () => ({
  getPublicAuthor: getPublicAuthorMock,
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

import RomanianAuthorPage, {
  generateMetadata as generateRomanianMetadata,
} from '../../src/app/(frontend)/[lang]/autori/[slug]/page'

import EnglishAuthorPage, {
  generateMetadata as generateEnglishMetadata,
} from '../../src/app/(frontend)/[lang]/authors/[slug]/page'

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

function params(
  lang: string,
  slug = 'ana-popescu',
) {
  return {
    params: Promise.resolve({
      lang,
      slug,
    }),
  }
}

describe('public author routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getPublicAuthorMock.mockResolvedValue(
      fixture(),
    )
  })

  it('renders the Romanian author route through the public reader', async () => {
    const page =
      await RomanianAuthorPage(
        params('ro'),
      )

    const html =
      renderToStaticMarkup(page)

    expect(
      getPublicAuthorMock,
    ).toHaveBeenCalledWith(
      'ana-popescu',
      'ro',
    )

    expect(html).toContain(
      'Ana Popescu',
    )
  })

  it('renders the English author route through the public reader', async () => {
    getPublicAuthorMock.mockResolvedValue(
      fixture({
        localization: {
          language: 'en',
          fallbackFields: [],
        },
      }),
    )

    const page =
      await EnglishAuthorPage(
        params('en'),
      )

    const html =
      renderToStaticMarkup(page)

    expect(
      getPublicAuthorMock,
    ).toHaveBeenCalledWith(
      'ana-popescu',
      'en',
    )

    expect(html).toContain(
      'Ana Popescu',
    )
  })

  it('rejects /en/autori before querying Payload', async () => {
    await expect(
      RomanianAuthorPage(
        params('en'),
      ),
    ).rejects.toThrow('NOT_FOUND')

    expect(
      getPublicAuthorMock,
    ).not.toHaveBeenCalled()
  })

  it('rejects /ro/authors before querying Payload', async () => {
    await expect(
      EnglishAuthorPage(
        params('ro'),
      ),
    ).rejects.toThrow('NOT_FOUND')

    expect(
      getPublicAuthorMock,
    ).not.toHaveBeenCalled()
  })

  it('returns 404 when the Romanian public reader finds no profile', async () => {
    getPublicAuthorMock.mockResolvedValue(
      null,
    )

    await expect(
      RomanianAuthorPage(
        params('ro'),
      ),
    ).rejects.toThrow('NOT_FOUND')
  })

  it('returns 404 when the English public reader finds no profile', async () => {
    getPublicAuthorMock.mockResolvedValue(
      null,
    )

    await expect(
      EnglishAuthorPage(
        params('en'),
      ),
    ).rejects.toThrow('NOT_FOUND')
  })

  it('builds Romanian route metadata through the approved metadata contract', async () => {
    const metadata =
      await generateRomanianMetadata(
        params('ro'),
      )

    expect(metadata.alternates).toEqual({
      canonical:
        '/ro/autori/ana-popescu',
      languages: {
        ro: '/ro/autori/ana-popescu',
        en: '/en/authors/ana-popescu',
      },
    })

    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
    })
  })

  it('builds English metadata with the English canonical route', async () => {
    getPublicAuthorMock.mockResolvedValue(
      fixture({
        localization: {
          language: 'en',
          fallbackFrom: 'ro',
          fallbackFields: [
            'shortBio',
          ],
        },
      }),
    )

    const metadata =
      await generateEnglishMetadata(
        params('en'),
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

  it('does not query an invalid language during metadata generation', async () => {
    const roWrong =
      await generateRomanianMetadata(
        params('en'),
      )

    const enWrong =
      await generateEnglishMetadata(
        params('ro'),
      )

    expect(roWrong).toEqual({})
    expect(enWrong).toEqual({})

    expect(
      getPublicAuthorMock,
    ).not.toHaveBeenCalled()
  })

  it('returns empty metadata when no published author exists', async () => {
    getPublicAuthorMock.mockResolvedValue(
      null,
    )

    const metadata =
      await generateRomanianMetadata(
        params('ro'),
      )

    expect(metadata).toEqual({})
  })
})
