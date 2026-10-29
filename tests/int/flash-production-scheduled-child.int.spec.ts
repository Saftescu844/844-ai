import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }))
vi.mock('node:child_process', () => ({ spawn: spawnMock, default: { spawn: spawnMock } }))
import { runProductionScheduledChild, PRODUCTION_SCHEDULE_CHILD_TIMEOUT_MS } from '../../src/lib/flash/ingestion/flashProductionScheduledChild'

function fakeChild() {
  const child = Object.assign(new EventEmitter(), { pid: 1234567, stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn() })
  spawnMock.mockReturnValue(child)
  return child
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); spawnMock.mockReset() })

describe('Scheduled production child isolation', () => {
  it('uses the existing one-shot guards, one attempt and its own process group', async () => {
    const child = fakeChild()
    const result = runProductionScheduledChild(5, 'https://research.google/blog/a/')
    child.stdout.write('FLASH_RSS_PRODUCTION_ONE_SHOT_OK\n')
    child.emit('close', 0)
    expect(await result).toEqual({ outcome: 'pair_created' })
    expect(spawnMock.mock.calls[0][1]).toEqual(expect.arrayContaining(['--allow-production-rss-one-shot', '--max-attempts', '1', '--max-age-days', '30']))
    expect(spawnMock.mock.calls[0][2]).toMatchObject({ detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  })
  it('does not mistake a source title containing a success token for a saved pair', async () => {
    const child = fakeChild()
    const result = runProductionScheduledChild(5, 'https://research.google/blog/a/')
    child.stdout.write("  title: 'FLASH_RSS_PRODUCTION_ONE_SHOT_OK',\nFLASH_RSS_PRODUCTION_ONE_SHOT_NO_ELIGIBLE_CANDIDATE\n")
    child.emit('close', 0)
    expect(await result).toEqual({ outcome: 'skipped' })
  })
  it('retains no provider/database error text in its terminal result', async () => {
    const child = fakeChild()
    const result = runProductionScheduledChild(6, 'https://news.mit.edu/a')
    child.stderr.write('private-source-text secret-api-key database-password')
    child.emit('close', 1)
    expect(await result).toEqual({ outcome: 'failed', reason: 'process_failed' })
  })
  it('kills the entire child process group on deadline rather than leaving provider grandchildren', async () => {
    vi.useFakeTimers()
    const kill = vi.spyOn(process, 'kill').mockReturnValue(true)
    const child = fakeChild()
    const result = runProductionScheduledChild(5, 'https://research.google/blog/a/')
    await vi.advanceTimersByTimeAsync(PRODUCTION_SCHEDULE_CHILD_TIMEOUT_MS)
    expect(kill).toHaveBeenCalledWith(-child.pid, 'SIGKILL')
    child.emit('close', null)
    expect(await result).toEqual({ outcome: 'failed', reason: 'timeout' })
  })
})
