import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  activeFlashRssCandidateSkipUrls,
  canonicalFlashRssCandidateUrl,
  FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT,
  rememberFlashRssCandidateSkip,
} from '@/lib/flash/ingestion/rssCandidateSkipMemory'

describe(
  'Flash RSS rejected-candidate memory',
  () => {
    const now =
      '2026-10-07T13:30:00.000Z'

    it(
      'canonicalizes URLs before remembering or matching them',
      () => {
        expect(
          canonicalFlashRssCandidateUrl(
            'https://example.com/news/item?utm_source=rss#section',
          ),
        ).toBe(
          'https://example.com/news/item',
        )
      },
    )

    it(
      'blocks a remembered quality rejection during the cooldown window',
      () => {
        const memory =
          rememberFlashRssCandidateSkip({
            value:
              [],
            url:
              'https://example.com/news/item?utm_source=rss',
            reason:
              'event_identity_not_grounded',
            skippedAt:
              now,
          })

        const active =
          activeFlashRssCandidateSkipUrls(
            memory,
            Date.parse(
              '2026-10-10T13:30:00.000Z',
            ),
          )

        expect(
          active.has(
            'https://example.com/news/item',
          ),
        ).toBe(
          true,
        )
      },
    )

    it(
      'expires remembered rejections after seven days',
      () => {
        const memory = [
          {
            url:
              'https://example.com/news/item',
            reason:
              'event_identity_not_grounded',
            skippedAt:
              now,
          },
        ]

        const active =
          activeFlashRssCandidateSkipUrls(
            memory,
            Date.parse(
              '2026-10-14T13:30:00.001Z',
            ),
          )

        expect(
          active.size,
        ).toBe(
          0,
        )
      },
    )

    it(
      'refreshes the same URL without duplication and keeps memory bounded',
      () => {
        const previous =
          Array.from(
            {
              length:
                FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT + 20,
            },
            (_, index) => ({
              url:
                `https://example.com/news/${index}`,
              reason:
                'strong_duplicate' as const,
              skippedAt:
                '2026-10-06T13:30:00.000Z',
            }),
          )

        const memory =
          rememberFlashRssCandidateSkip({
            value:
              previous,
            url:
              'https://example.com/news/5?ref=rss',
            reason:
              'event_identity_not_grounded',
            skippedAt:
              now,
          })

        expect(
          memory,
        ).toHaveLength(
          FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT,
        )

        expect(
          memory[0],
        ).toMatchObject({
          url:
            'https://example.com/news/5',
          reason:
            'event_identity_not_grounded',
          skippedAt:
            now,
        })

        expect(
          memory.filter(
            entry =>
              entry.url ===
                'https://example.com/news/5',
          ),
        ).toHaveLength(
          1,
        )
      },
    )
  },
)
