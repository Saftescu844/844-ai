export const FLASH_RSS_MAX_FEED_BYTES =
  2 * 1024 * 1024

export const FLASH_RSS_REQUEST_TIMEOUT_MS =
  15_000

export type FlashRssFetch =
  typeof fetch

function normalizedHost(
  value: string,
): string {
  return new URL(
    value,
  )
    .hostname
    .toLowerCase()
    .replace(
      /\.$/,
      '',
    )
    .replace(
      /^www\./,
      '',
    )
}

export async function fetchFlashRssFeedXml({
  feedUrl,
  registeredSourceUrl,
  fetchImpl = fetch,
  maxBytes =
    FLASH_RSS_MAX_FEED_BYTES,
  timeoutMs =
    FLASH_RSS_REQUEST_TIMEOUT_MS,
}: {
  feedUrl: string
  registeredSourceUrl: string
  fetchImpl?: FlashRssFetch
  maxBytes?: number
  timeoutMs?: number
}): Promise<string> {
  const controller =
    new AbortController()

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs,
    )

  try {
    const response =
      await fetchImpl(
        feedUrl,
        {
          signal:
            controller.signal,
          redirect:
            'follow',
          headers: {
            accept:
              'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
            'user-agent':
              '844-ai-flash-rss/1.0',
          },
        },
      )

    if (!response.ok) {
      throw new Error(
        `RSS retrieval failed with HTTP ${response.status}.`,
      )
    }

    if (
      normalizedHost(
        response.url,
      ) !==
      normalizedHost(
        registeredSourceUrl,
      )
    ) {
      throw new Error(
        'RSS retrieval redirected outside the registered source host.',
      )
    }

    const contentLength =
      Number(
        response.headers.get(
          'content-length',
        ),
      )

    if (
      Number.isFinite(
        contentLength,
      ) &&
      contentLength >
        maxBytes
    ) {
      throw new Error(
        'RSS feed exceeds the configured size limit.',
      )
    }

    const buffer =
      await response
        .arrayBuffer()

    if (
      buffer.byteLength >
      maxBytes
    ) {
      throw new Error(
        'RSS feed exceeds the configured size limit.',
      )
    }

    return new TextDecoder()
      .decode(
        buffer,
      )
  } finally {
    clearTimeout(
      timeout,
    )
  }
}
