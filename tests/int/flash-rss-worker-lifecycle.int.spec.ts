// @vitest-environment node
import { EventEmitter } from 'node:events'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { installFlashRssShutdown, runFlashRssChild } from '@/lib/flash/audit/flashRssShutdown'
import { FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'
import { assertFlashRssDeployIdle, assertFlashRssDeployTarget, FLASH_RSS_RUNNING_RUN_QUERY } from '@/lib/flash/audit/flashRssDeployPreflight'

const target = { RAILWAY_PROJECT_ID: '44c37d0f-b300-4462-b001-31259ddae5dd',
  RAILWAY_ENVIRONMENT_ID: 'a589dc28-1c59-468c-9eb4-351fce8fa17b',
  RAILWAY_SERVICE_ID: 'd479e8ea-00a4-4b58-87a0-fc3221f4679c', PAYLOAD_DB_PUSH: 'false',
  DATABASE_URL: 'postgresql://postgres:fake@db.tvtnpcqawaekhmhyfrnc.supabase.co:5432/postgres' }
const childOptions = (signal = new AbortController().signal, maxBuffer = 4096) => ({ cwd: process.cwd(), env: process.env, signal, maxBuffer })

describe('RSS worker deployment lifecycle without live services or providers', () => {
  it('allows only the staging worker target and known staging database', () => {
    expect(() => assertFlashRssDeployTarget(target)).not.toThrow()
    for (const patch of [{ RAILWAY_PROJECT_ID: 'production' }, { RAILWAY_ENVIRONMENT_ID: '' },
      { RAILWAY_SERVICE_ID: '7be51b73-dc87-4a53-9ad4-879c00aecad6' }, { PAYLOAD_DB_PUSH: 'true' },
      { DATABASE_URL: 'postgresql://postgres:fake@db.hyapqvnubhwkwmwudeit.supabase.co/postgres' }]) {
      expect(() => assertFlashRssDeployTarget({ ...target, ...patch })).toThrow()
    }
  })

  it('blocks both active and old unresolved running audits, with no timeout-based exemption', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 100 }] })
    await expect(assertFlashRssDeployIdle(query)).rejects.toThrow('RSS_DEPLOY_PREFLIGHT_RUNNING_OR_UNRESOLVED')
    expect(query).toHaveBeenCalledExactlyOnceWith(FLASH_RSS_RUNNING_RUN_QUERY)
    expect(FLASH_RSS_RUNNING_RUN_QUERY).not.toMatch(/started_at|interval|DELETE|UPDATE/i)
    await expect(assertFlashRssDeployIdle(vi.fn().mockResolvedValue({ rows: [] }))).resolves.toBeUndefined()
    await expect(assertFlashRssDeployIdle(vi.fn().mockResolvedValue({ rows: null }))).rejects.toThrow('RSS_DEPLOY_PREFLIGHT_INVALID_RESULT')
    await expect(assertFlashRssDeployIdle(vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow('offline')
  })

  it('keeps child stdout/stderr, nonzero exit and output limits available to the handoff classifier', async () => {
    const normal = await runFlashRssChild(process.execPath, ['-e', 'process.stdout.write("out");process.stderr.write("err");process.exitCode=7'], childOptions())
    expect(normal).toMatchObject({ status: 7, signal: null, stdout: 'out', stderr: 'err' })
    const overflow = await runFlashRssChild(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], childOptions(undefined, 256))
    expect(overflow.error?.code).toBe('ENOBUFS')
    expect(Buffer.byteLength(overflow.stdout) + Buffer.byteLength(overflow.stderr)).toBeLessThanOrEqual(256)
    const missing = await runFlashRssChild('/nonexistent-rss-test-command', [], childOptions())
    expect(missing.error?.code).toBe('ENOENT')
  })

  it('aborts the active child and prevents another handoff after SIGTERM or SIGINT', async () => {
    for (const signal of ['SIGTERM', 'SIGINT']) {
      const emitter = new EventEmitter()
      const shutdown = installFlashRssShutdown(emitter)
      const child = runFlashRssChild(process.execPath, ['-e', 'setInterval(()=>{},1000)'], childOptions(shutdown.signal))
      emitter.emit(signal)
      await expect(child).rejects.toMatchObject({ code: 'RSS_PROCESS_INTERRUPTED' })
      expect(() => shutdown.assertRunning()).toThrow('RSS_PROCESS_INTERRUPTED')
      await expect(runFlashRssChild('/must-not-start', [], childOptions(shutdown.signal))).rejects.toMatchObject({ code: 'RSS_PROCESS_INTERRUPTED' })
      shutdown.dispose()
      expect(emitter.listenerCount(signal)).toBe(0)
    }
  })

  it('finalizes only the audit after a real parent SIGTERM while awaiting a child', () => {
    const shutdownModule = resolve('src/lib/flash/audit/flashRssShutdown.ts')
    const auditModule = resolve('src/lib/flash/audit/flashRssRunDiagnostics.ts')
    const code = `import { installFlashRssShutdown, runFlashRssChild } from ${JSON.stringify(shutdownModule)};
      import { FlashRssRunDiagnostics } from ${JSON.stringify(auditModule)};
      const shutdown=installFlashRssShutdown();
      const updates=[];
      const audit=new FlashRssRunDiagnostics(()=>{}, Date.now, '11111111-1111-4111-8111-111111111111');
      await audit.start({create:async()=>({id:17}),update:async x=>{updates.push(x);return {id:17}}},'test','test-sha');
      await audit.checkpoint('generation-en',9);
      try { await runFlashRssChild(process.execPath,['-e','setTimeout(()=>process.kill(process.ppid,"SIGTERM"),50);setInterval(()=>{},1000)'],{cwd:process.cwd(),env:process.env,maxBuffer:4096,signal:shutdown.signal});process.exitCode=2; }
      catch(e) { await audit.finish(true,e.code); console.log(JSON.stringify(updates));process.exitCode=1; }
      finally {shutdown.dispose();}`
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { encoding: 'utf8', timeout: 10_000 })
    expect(result.status, result.stderr).toBe(1)
    const updates = JSON.parse(result.stdout)
    expect(updates.at(-1).data).toMatchObject({ status: 'failed', errorCode: 'RSS_PROCESS_INTERRUPTED',
      evidenceSummary: { stage: 'generation-en', outcome: null, roId: null, enId: null, deploymentId: '11111111-1111-4111-8111-111111111111' } })
    expect(updates.at(-1).data.completedAt).toBeTruthy()
    expect(updates.every((x: {collection: string}) => x.collection === 'flash-engine-runs')).toBe(true)
  })

  it('does not replace an already confirmed pair outcome with an interruption failure', async () => {
    const emitter = new EventEmitter()
    const shutdown = installFlashRssShutdown(emitter)
    const update = vi.fn().mockResolvedValue({ id: 1 })
    const audit = new FlashRssRunDiagnostics(() => {})
    await audit.start({ create: vi.fn().mockResolvedValue({ id: 1 }), update } as never, 'test', 'sha')
    await audit.checkpoint('pair-persistence')
    // A signal requests no new work; it does not cancel the atomic transaction.
    emitter.emit('SIGTERM')
    audit.result('pair-created', { roId: 1, enId: 2 })
    await audit.finish()
    expect(update.mock.lastCall?.[0].data).toMatchObject({ status: 'completed', errorCode: null,
      evidenceSummary: { outcome: 'pair-created', roId: 1, enId: 2 } })
    shutdown.dispose()
  })

  it('rejects preflight credentials before database connection and prints no secret', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/flash-rss-deploy-preflight.ts'], {
      encoding: 'utf8', timeout: 10_000,
      env: { ...process.env, RAILWAY_PROJECT_ID: 'wrong', DATABASE_URL: 'secret-must-not-appear' },
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('RSS_DEPLOY_PREFLIGHT_FAILED')
    expect(result.stderr + result.stdout).not.toContain('secret-must-not-appear')
  })
})
