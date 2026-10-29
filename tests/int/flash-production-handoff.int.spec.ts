// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import {
  FLASH_PRODUCTION_HANDOFF_TIMEOUT_MS,
  FlashProductionOneShotHandoffError,
  runFlashProductionOneShotHandoff,
} from '@/lib/flash/ingestion/flashProductionOneShotHandoff'

const input = {
  sourceId: 5, articleUrl: 'https://research.google/blog/example/', targetLanguage: 'ro' as const,
  model: 'test-model', outputPath: '/tmp/ro.json', expectedServiceId: 'production-test',
  freshnessPolicy: { now: Date.parse('2026-10-29T09:00:00Z'), maxAgeDays: 30 },
}
function spawnResult(status: number | null, stderr = '', error?: NodeJS.ErrnoException) {
  return { status, stderr, stdout: '', error, pid: 1, output: [], signal: null } as ReturnType<typeof spawnSync>
}

describe('Bounded production handoff subprocess', () => {
  it('prepares RO and EN with the same UTC window and reuses only the RO handoff for EN', () => {
    const spawn = vi.fn<typeof spawnSync>().mockReturnValue(spawnResult(0))
    runFlashProductionOneShotHandoff(input, spawn)
    runFlashProductionOneShotHandoff({ ...input, targetLanguage: 'en', outputPath: '/tmp/en.json',
      classificationHandoffPath: '/tmp/ro.json' }, spawn)
    const [ro, en] = spawn.mock.calls
    for (const call of [ro!, en!]) {
      expect(call[1]).toEqual(expect.arrayContaining([
        '--require-grounded-event-identity', '--allow-production-one-shot',
        '--expected-production-service-id', 'production-test', '--rss-freshness-now',
        '2026-10-29T09:00:00.000Z', '--rss-max-age-days', '30',
      ]))
      expect(call[2]).toMatchObject({ timeout: FLASH_PRODUCTION_HANDOFF_TIMEOUT_MS, killSignal: 'SIGKILL' })
    }
    expect(ro![1]).not.toContain('--classification-handoff-input')
    expect(en![1]).toEqual(expect.arrayContaining(['--classification-handoff-input', '/tmp/ro.json']))
  })

  it('refuses EN without RO reuse, RO with reuse, and invalid policies before a process starts', () => {
    const spawn = vi.fn<typeof spawnSync>()
    expect(() => runFlashProductionOneShotHandoff({ ...input, targetLanguage: 'en' }, spawn)).toThrow('same-run RO')
    expect(() => runFlashProductionOneShotHandoff({ ...input, classificationHandoffPath: '/tmp/old.json' }, spawn)).toThrow('same-run RO')
    expect(() => runFlashProductionOneShotHandoff({ ...input, freshnessPolicy: { now: NaN, maxAgeDays: 30 } }, spawn)).toThrow('Invalid RSS')
    expect(() => runFlashProductionOneShotHandoff({ ...input, freshnessPolicy: { ...input.freshnessPolicy, maxAgeDays: 31 } }, spawn)).toThrow('Invalid RSS')
    expect(spawn).not.toHaveBeenCalled()
  })

  it.each([
    ['FLASH_RSS_FRESHNESS_REJECTED:too_old', 'article_publication_not_current'],
    ['does not have a grounded event identity required by this flow', 'event_identity_not_grounded'],
    ['strong duplicate evidence exists', 'strong_duplicate'],
  ])('classifies %s as a controlled skip without exposing child output', (diagnostic, reason) => {
    const spawn = vi.fn<typeof spawnSync>().mockReturnValue(spawnResult(1, diagnostic + ' PRIVATE_OUTPUT'))
    try { runFlashProductionOneShotHandoff(input, spawn); expect.fail('expected rejection') } catch (error) {
      expect(error).toBeInstanceOf(FlashProductionOneShotHandoffError)
      expect(error).toMatchObject({ reason, controlledSkip: true })
      expect((error as Error).message).not.toContain('PRIVATE_OUTPUT')
    }
    expect(spawn).toHaveBeenCalledOnce()
  })

  it('reports a killed timeout as a terminal failure with no retry', () => {
    const spawn = vi.fn<typeof spawnSync>().mockReturnValue(spawnResult(null, '', Object.assign(new Error('secret request'), { code: 'ETIMEDOUT' })))
    expect(() => runFlashProductionOneShotHandoff(input, spawn)).toThrow('handoff_timeout')
    expect(spawn).toHaveBeenCalledOnce()
  })

  it('does not log provider errors, secrets, or raw model content for unknown failures', () => {
    const spawn = vi.fn<typeof spawnSync>().mockReturnValue(spawnResult(1, 'PRIVATE_CREDENTIAL AND RAW ARTICLE'))
    try { runFlashProductionOneShotHandoff(input, spawn); expect.fail('expected rejection') } catch (error) {
      expect(error).toMatchObject({ reason: 'handoff_failed', controlledSkip: false })
      expect((error as Error).message).toBe('Production one-shot handoff failed: handoff_failed.')
    }
  })
})
