import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
} from 'vitest'

import ArticleDates from '../../src/components/ArticleDates'

describe('ArticleDates', () => {
  it('renders only the initial publication when there is no significant update', () => {
    const html = renderToStaticMarkup(
      <ArticleDates
        publishedAt="2026-07-21T12:00:00.000Z"
        significantUpdatedAt={null}
        lang="ro"
      />,
    )

    expect(html).toContain(
      'Publicat:',
    )
    expect(html).toContain(
      '21 iulie 2026',
    )
    expect(html).not.toContain(
      'Actualizat semnificativ',
    )
  })

  it('renders a later significant editorial update', () => {
    const html = renderToStaticMarkup(
      <ArticleDates
        publishedAt="2026-07-21T12:00:00.000Z"
        significantUpdatedAt="2026-09-01T12:00:00.000Z"
        lang="ro"
      />,
    )

    expect(html).toContain(
      'Publicat:',
    )
    expect(html).toContain(
      'Actualizat semnificativ:',
    )
    expect(html).toContain(
      '1 septembrie 2026',
    )
  })

  it('suppresses an invalid earlier update through the shared date rule', () => {
    const html = renderToStaticMarkup(
      <ArticleDates
        publishedAt="2026-07-21T12:00:00.000Z"
        significantUpdatedAt="2026-07-20T12:00:00.000Z"
        lang="ro"
      />,
    )

    expect(html).toContain(
      'Publicat:',
    )
    expect(html).not.toContain(
      'Actualizat semnificativ',
    )
  })

  it('renders the English labels', () => {
    const html = renderToStaticMarkup(
      <ArticleDates
        publishedAt="2026-07-21T12:00:00.000Z"
        significantUpdatedAt="2026-09-01T12:00:00.000Z"
        lang="en"
      />,
    )

    expect(html).toContain(
      'Published:',
    )
    expect(html).toContain(
      'Significantly updated:',
    )
    expect(html).toContain(
      '21 July 2026',
    )
  })
})
