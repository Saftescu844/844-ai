import { spawn } from 'node:child_process'
import { FlashRssControlledFailure } from './flashRssRunDiagnostics'

interface SignalTarget {
  on(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown
  off(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown
}

/** Signals identify an interruption, not its cause (deploy, operator stop, etc.). */
export function installFlashRssShutdown(target: SignalTarget = process) {
  const controller = new AbortController()
  const stop = () => controller.abort()
  target.on('SIGTERM', stop)
  target.on('SIGINT', stop)
  return {
    signal: controller.signal,
    assertRunning() {
      if (controller.signal.aborted) throw new FlashRssControlledFailure('RSS_PROCESS_INTERRUPTED')
    },
    dispose() {
      target.off('SIGTERM', stop)
      target.off('SIGINT', stop)
    },
  }
}

/** Await the existing handoff without blocking the parent's signal handlers. */
export async function runFlashRssChild(command: string, args: string[], options: {
  cwd: string; env: NodeJS.ProcessEnv; maxBuffer: number; signal: AbortSignal
}): Promise<{ stdout: string; stderr: string; status: number | null; signal: NodeJS.Signals | null; error?: NodeJS.ErrnoException }> {
  if (options.signal.aborted) throw new FlashRssControlledFailure('RSS_PROCESS_INTERRUPTED')
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'] })
    const stdout: Buffer[] = [], stderr: Buffer[] = []
    let bytes = 0
    let error: NodeJS.ErrnoException | undefined
    let killTimer: ReturnType<typeof setTimeout> | undefined
    const terminate = () => {
      child.kill('SIGTERM')
      killTimer ??= setTimeout(() => child.kill('SIGKILL'), 5_000)
      killTimer.unref()
    }
    const abort = () => terminate()
    options.signal.addEventListener('abort', abort, { once: true })
    if (options.signal.aborted) terminate()
    const collect = (chunks: Buffer[], chunk: Buffer) => {
      if (error?.code === 'ENOBUFS') return
      bytes += chunk.length
      if (bytes > options.maxBuffer) {
        error = Object.assign(new Error('RSS child output limit.'), { code: 'ENOBUFS' })
        terminate()
        return
      }
      chunks.push(chunk)
    }
    child.stdout.on('data', chunk => collect(stdout, chunk))
    child.stderr.on('data', chunk => collect(stderr, chunk))
    child.on('error', value => { error = value })
    child.on('close', (status, signal) => {
      options.signal.removeEventListener('abort', abort)
      if (killTimer) clearTimeout(killTimer)
      if (options.signal.aborted) {
        reject(new FlashRssControlledFailure('RSS_PROCESS_INTERRUPTED'))
      } else {
        resolve({ stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), status, signal, error })
      }
    })
  })
}
