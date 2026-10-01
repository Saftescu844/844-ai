import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  getPublicArticleDates,
} from '../../src/lib/article-dates'

describe('public article dates', () => {
  it('keeps the first publication date', () => {
    expect(
      getPublicArticleDates({
        publishedAt:
          '2026-07-21T08:59:14.893Z',
        significantUpdatedAt: null,
      }),
    ).toEqual({
      publishedAt:
        '2026-07-21T08:59:14.893Z',
    })
  })

  it('exposes a later significant editorial update', () => {
    expect(
      getPublicArticleDates({
        publishedAt:
          '2026-07-21T08:59:14.893Z',
        significantUpdatedAt:
          '2026-09-01T10:00:00.000Z',
      }),
    ).toEqual({
      publishedAt:
        '2026-07-21T08:59:14.893Z',
      significantUpdatedAt:
        '2026-09-01T10:00:00.000Z',
    })
  })

  it('suppresses an update that predates publication', () => {
    expect(
      getPublicArticleDates({
        publishedAt:
          '2026-07-21T08:59:14.893Z',
        significantUpdatedAt:
          '2026-07-20T10:00:00.000Z',
      }),
    ).toEqual({
      publishedAt:
        '2026-07-21T08:59:14.893Z',
    })
  })

  it('does not expose an update without a valid publication date', () => {
    expect(
      getPublicArticleDates({
        publishedAt: null,
        significantUpdatedAt:
          '2026-09-01T10:00:00.000Z',
      }),
    ).toEqual({})
  })
})
