import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  isFlashRssArticleRetrievalHttpFailure,
  runFlashRssStageNextAttempts,
} from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'

describe('Flash RSS bounded stage-next attempts', () => {
  it('classifies only the observed HTML retrieval HTTP failure as skippable', () => {
    expect(
      isFlashRssArticleRetrievalHttpFailure(
        'FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_FAILED\nHTML article retrieval failed: http_error.',
      ),
    ).toBe(true)
    expect(
      isFlashRssArticleRetrievalHttpFailure(
        'Database credentials missing',
      ),
    ).toBe(false)
    expect(
      isFlashRssArticleRetrievalHttpFailure(
        'HTML article retrieval failed: invalid_url.',
      ),
    ).toBe(false)
  })

  it('continues to candidate 2 after HTTP retrieval failure and stops on success', async () => {
    const visited: number[] = []
    const processCandidate = vi.fn(async (candidate: number) => {
      visited.push(candidate)
      if (candidate === 1) {
        const output = 'HTML article retrieval failed: http_error.'
        if (isFlashRssArticleRetrievalHttpFailure(output)) {
          return 'skip' as const
        }
        throw new Error(output)
      }
      return 'complete' as const
    })

    const result = await runFlashRssStageNextAttempts({
      candidates: [1, 2, 3, 4],
      maxAttempts: 3,
      processCandidate,
    })

    expect(result).toEqual({ completed: true, attemptedCount: 2 })
    expect(visited).toEqual([1, 2])
    expect(processCandidate).toHaveBeenCalledTimes(2)
  })

  it('does not exceed maxAttempts=3 when every candidate is skipped', async () => {
    const processCandidate = vi.fn(async () => 'skip' as const)
    const result = await runFlashRssStageNextAttempts({
      candidates: [1, 2, 3, 4, 5],
      maxAttempts: 3,
      processCandidate,
    })
    expect(result).toEqual({ completed: false, attemptedCount: 3 })
    expect(processCandidate).toHaveBeenCalledTimes(3)
  })

  it('propagates unknown errors rather than skipping another candidate', async () => {
    const processCandidate = vi.fn(async () => {
      throw new Error('Unexpected database failure')
    })
    await expect(
      runFlashRssStageNextAttempts({
        candidates: [1, 2, 3],
        maxAttempts: 3,
        processCandidate,
      }),
    ).rejects.toThrow('Unexpected database failure')
    expect(processCandidate).toHaveBeenCalledTimes(1)
  })
})
