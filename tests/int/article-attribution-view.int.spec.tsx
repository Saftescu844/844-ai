import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
} from 'vitest'

import ArticleAttribution from '../../src/components/ArticleAttribution'

import type {
  PublicArticleAttribution,
} from '../../src/lib/article-attribution'

function attribution(
  overrides: Partial<PublicArticleAttribution> = {},
): PublicArticleAttribution {
  return {
    primaryAuthor: {
      fullName: 'Redacția 844 AI',
      slug: 'redactia-844-ai',
      editorialRoles: [
        'author',
        'contentCurator',
      ],
      robots: 'indexFollow',
      localization: {
        language: 'ro',
        fallbackFields: [],
      },
    },
    coauthors: [],
    expertContributors: [],
    ...overrides,
  }
}

describe('ArticleAttribution', () => {
  it('renders the Romanian primary-author byline', () => {
    const html = renderToStaticMarkup(
      <ArticleAttribution
        attribution={attribution()}
        lang="ro"
      />,
    )

    expect(html).toContain('De')
    expect(html).toContain(
      'Redacția 844 AI',
    )
    expect(html).toContain(
      '/ro/autori/redactia-844-ai',
    )
  })

  it('renders the English primary-author route', () => {
    const html = renderToStaticMarkup(
      <ArticleAttribution
        attribution={attribution()}
        lang="en"
      />,
    )

    expect(html).toContain('By')
    expect(html).toContain(
      '/en/authors/redactia-844-ai',
    )
  })

  it('renders nothing without a public primary author', () => {
    const html = renderToStaticMarkup(
      <ArticleAttribution
        attribution={attribution({
          primaryAuthor: undefined,
        })}
        lang="ro"
      />,
    )

    expect(html).toBe('')
  })
})
