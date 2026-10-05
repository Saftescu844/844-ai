import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  fetchFlashRssFeedXml,
} from '../../src/lib/flash/ingestion/rssFeedRetriever'

function response({
  url,
  body,
  contentLength,
}: {
  url: string
  body: string
  contentLength?: string
}): Response {
  const bytes =
    new TextEncoder()
      .encode(
        body,
      )

  return {
    ok:
      true,
    status:
      200,
    url,
    headers:
      new Headers(
        contentLength
          ? {
              'content-length':
                contentLength,
            }
          : undefined,
      ),
    arrayBuffer:
      async () =>
        bytes.buffer,
  } as Response
}

describe(
  'Flash RSS feed retriever',
  () => {
    it(
      'accepts a bounded same-host feed',
      async () => {
        const xml =
          await fetchFlashRssFeedXml({
            feedUrl:
              'https://research.google/blog/rss/',
            registeredSourceUrl:
              'https://research.google/',
            fetchImpl:
              async () =>
                response({
                  url:
                    'https://research.google/blog/rss/',
                  body:
                    '<rss>ok</rss>',
                }),
          })

        expect(
          xml,
        ).toBe(
          '<rss>ok</rss>',
        )
      },
    )

    it(
      'rejects a redirect outside the registered source host',
      async () => {
        await expect(
          fetchFlashRssFeedXml({
            feedUrl:
              'https://research.google/blog/rss/',
            registeredSourceUrl:
              'https://research.google/',
            fetchImpl:
              async () =>
                response({
                  url:
                    'https://example.com/rss/',
                  body:
                    '<rss>bad</rss>',
                }),
          }),
        ).rejects.toThrow(
          'redirected outside the registered source host',
        )
      },
    )

    it(
      'rejects a feed larger than the configured limit',
      async () => {
        await expect(
          fetchFlashRssFeedXml({
            feedUrl:
              'https://research.google/blog/rss/',
            registeredSourceUrl:
              'https://research.google/',
            maxBytes:
              10,
            fetchImpl:
              async () =>
                response({
                  url:
                    'https://research.google/blog/rss/',
                  body:
                    '<rss>too large</rss>',
                  contentLength:
                    '100',
                }),
          }),
        ).rejects.toThrow(
          'exceeds the configured size limit',
        )
      },
    )
  },
)
