import { spawn } from 'node:child_process'

export const PRODUCTION_SCHEDULE_CHILD_TIMEOUT_MS = 480_000
const OUTPUT_LIMIT = 20 * 1024 * 1024

/** Execute the already-guarded one-shot, retaining only its bounded summary. */
export function runProductionScheduledChild(sourceId: number, articleUrl: string): Promise<{
  outcome: 'pair_created' | 'skipped' | 'failed'
  reason?: 'timeout' | 'output_limit' | 'process_failed'
}> {
  return new Promise(resolve => {
    let stdout = ''
    let bytes = 0
    let failure: 'timeout' | 'output_limit' | 'process_failed' | undefined
    const child = spawn(process.execPath, [
      '--import', 'tsx', 'scripts/flash-rss-production-one-shot.ts',
      '--model', 'gpt-5.6-terra', '--allow-provider-requests', '--allow-production-rss-one-shot',
      '--expected-production-service-id', '6e954363-b055-4032-a501-f5615cc49932',
      '--source-id', String(sourceId), '--candidate-url', articleUrl,
      '--max-items', '10', '--max-attempts', '1', '--max-age-days', '30',
    ], { cwd: process.cwd(), env: process.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const killGroup = (reason: typeof failure) => {
      failure = reason
      if (child.pid) {
        try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
      }
    }
    const timer = setTimeout(() => killGroup('timeout'), PRODUCTION_SCHEDULE_CHILD_TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > OUTPUT_LIMIT) killGroup('output_limit')
      else stdout += chunk.toString('utf8')
    })
    // Provider/database diagnostics never escape the child or get retained here.
    child.stderr.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > OUTPUT_LIMIT) killGroup('output_limit')
    })
    child.on('error', () => { failure = 'process_failed' })
    child.on('close', code => {
      clearTimeout(timer)
      if (failure || code !== 0) resolve({ outcome: 'failed', reason: failure ?? 'process_failed' })
      else resolve({ outcome: /^FLASH_RSS_PRODUCTION_ONE_SHOT_OK\r?$/m.test(stdout) ? 'pair_created' : 'skipped' })
    })
  })
}
