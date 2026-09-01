import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const {
  getPublicAuthorByIDMock,
} = vi.hoisted(() => ({
  getPublicAuthorByIDMock: vi.fn(),
}))

vi.mock('@/lib/authors-reader', () => ({
  getPublicAuthorByID:
    getPublicAuthorByIDMock,
}))

import {
  resolvePublicArticleAttribution,
} from '../../src/lib/article-attribution'

function publicAuthor(
  fullName: string,
  slug: string,
) {
  return {
    fullName,
    slug,
    editorialRoles: ['author'],
    robots: 'indexFollow',
    localization: {
      language: 'ro',
      fallbackFields: [],
    },
  }
}

describe('public article attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getPublicAuthorByIDMock.mockImplementation(
      async (id: number) => {
        if (id === 1) {
          return publicAuthor(
            'Redacția 844 AI',
            'redactia-844-ai',
          )
        }

        if (id === 2) {
          return publicAuthor(
            'Ana Popescu',
            'ana-popescu',
          )
        }

        if (id === 3) {
          return publicAuthor(
            'Mihai Ionescu',
            'mihai-ionescu',
          )
        }

        return null
      },
    )
  })

  it('resolves all editorial relationships through the public author reader', async () => {
    const result =
      await resolvePublicArticleAttribution(
        {
          autorPrincipal: 1,
          coautori: [2],
          verificatorEditorial: {
            id: 3,
            fullName: 'Raw internal object',
          },
          verificatorMedical: null,
          contributoriExperti: [999],
        },
        'ro',
      )

    expect(result).toEqual({
      primaryAuthor: publicAuthor(
        'Redacția 844 AI',
        'redactia-844-ai',
      ),
      coauthors: [
        publicAuthor(
          'Ana Popescu',
          'ana-popescu',
        ),
      ],
      editorialReviewer: publicAuthor(
        'Mihai Ionescu',
        'mihai-ionescu',
      ),
      expertContributors: [],
    })

    expect(
      getPublicAuthorByIDMock,
    ).toHaveBeenCalledWith(1, 'ro')

    expect(
      getPublicAuthorByIDMock,
    ).toHaveBeenCalledWith(2, 'ro')

    expect(
      getPublicAuthorByIDMock,
    ).toHaveBeenCalledWith(3, 'ro')

    expect(
      getPublicAuthorByIDMock,
    ).toHaveBeenCalledWith(999, 'ro')
  })

  it('ignores invalid relationship values without querying authors', async () => {
    const result =
      await resolvePublicArticleAttribution(
        {
          autorPrincipal: null,
          coautori: [
            null,
            '12',
            -1,
            { id: '13' },
          ],
          verificatorEditorial:
            undefined,
          contributoriExperti:
            'not-an-array',
        },
        'ro',
      )

    expect(result).toEqual({
      coauthors: [],
      expertContributors: [],
    })

    expect(
      getPublicAuthorByIDMock,
    ).not.toHaveBeenCalled()
  })

  it('reuses the same public read when one author appears in multiple roles', async () => {
    const result =
      await resolvePublicArticleAttribution(
        {
          autorPrincipal: 1,
          coautori: [1],
          verificatorEditorial: 1,
        },
        'ro',
      )

    expect(result.primaryAuthor?.slug).toBe(
      'redactia-844-ai',
    )

    expect(result.coauthors).toHaveLength(1)

    expect(
      result.editorialReviewer?.slug,
    ).toBe('redactia-844-ai')

    expect(
      getPublicAuthorByIDMock,
    ).toHaveBeenCalledTimes(1)
  })
})
