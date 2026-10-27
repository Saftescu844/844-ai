import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  activeFlashRssCandidateSkipUrls,
  canonicalFlashRssCandidateUrl,
  FLASH_RSS_CANDIDATE_SKIP_MEMORY_LIMIT,
  FLASH_RSS_SHORT_OUTPUT_COOLDOWN_MS,
  rememberFlashRssCandidateSkip,
} from '@/lib/flash/ingestion/rssCandidateSkipMemory'
import { runFlashRssStageNextAttempts } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'

describe(
  'Flash RSS rejected-candidate memory',
  () => {
    const now =
      '2026-10-07T13:30:00.000Z'

    it.each([
      [0, true],
      [FLASH_RSS_SHORT_OUTPUT_COOLDOWN_MS - 1, true],
      [FLASH_RSS_SHORT_OUTPUT_COOLDOWN_MS, false],
    ])('expires a short-output pause at six hours (elapsed=%i)', (elapsed, expected) => {
      const memory = rememberFlashRssCandidateSkip({ value: [], url: 'https://example.com/short',
        reason: 'editorial_output_too_short', skippedAt: now })
      expect(activeFlashRssCandidateSkipUrls(JSON.parse(JSON.stringify(memory)), Date.parse(now) + elapsed)
        .has('https://example.com/short')).toBe(expected)
    })

    it('ignores a future-dated short-output pause', () => {
      const memory = [{ url: 'https://example.com/short', reason: 'editorial_output_too_short', skippedAt: now }]
      expect(activeFlashRssCandidateSkipUrls(memory, Date.parse(now) - 1).size).toBe(0)
    })

    it('prunes expired short-output entries while preserving ordinary seven-day rejections', () => {
      const previous = [
        { url: 'https://example.com/short', reason: 'editorial_output_too_short', skippedAt: now },
        { url: 'https://example.com/identity', reason: 'event_identity_not_grounded', skippedAt: now },
        { url: 'https://example.com/duplicate', reason: 'strong_duplicate', skippedAt: now },
      ]
      const memory = rememberFlashRssCandidateSkip({ value: previous, url: 'https://example.com/new',
        reason: 'editorial_output_too_short', skippedAt: '2026-10-07T19:30:00.000Z' })
      expect(memory.map(e => e.url)).toEqual(['https://example.com/new', 'https://example.com/identity', 'https://example.com/duplicate'])
    })

    it('frees an attempt for other candidates during the pause and retries after expiry', async () => {
      const candidates = ['https://example.com/short', 'https://example.com/second', 'https://example.com/third', 'https://example.com/fourth']
      const memory = rememberFlashRssCandidateSkip({ value: [], url: candidates[0]!,
        reason: 'editorial_output_too_short', skippedAt: now })
      for (const [elapsed, expected] of [[60 * 60 * 1000, candidates.slice(1)], [FLASH_RSS_SHORT_OUTPUT_COOLDOWN_MS, candidates.slice(0, 3)]] as const) {
        const active = activeFlashRssCandidateSkipUrls(memory, Date.parse(now) + elapsed)
        const calls: string[] = []
        const result = await runFlashRssStageNextAttempts({
          candidates: candidates.filter(url => !active.has(url)), maxAttempts: 3,
          processCandidate: async url => { calls.push(url); return 'skip' },
        })
        expect(calls).toEqual(expected)
        expect(result).toEqual({ completed: false, attemptedCount: 3 })
      }
    })

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
