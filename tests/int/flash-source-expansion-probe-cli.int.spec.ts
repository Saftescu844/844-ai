// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(args: string[], script = 'flash-first-source-expansion-preview.ts') {
  const env = { ...process.env }
  delete env.RAILWAY_PROJECT_ID
  delete env.RAILWAY_ENVIRONMENT_ID
  return spawnSync(process.execPath, ['--import', 'tsx', `scripts/${script}`, ...args],
    { encoding: 'utf8', env, timeout: 15_000 })
}

// Each case starts real Node processes; retain the 15s child limit under parallel CI load.
describe('Source-specific read-only probe CLI', { timeout: 30_000 }, () => {
  it('plans Anthropic only without contacting OpenAI or calling providers', () => {
    const result = run(['--source', 'anthropic-news'])
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([{ key: 'anthropic-news', method: 'html',
      url: 'https://www.anthropic.com/news', articleAdapterAvailable: true, activated: false }])
  })
  it('plans Microsoft Research without network or registry activation', () => {
    const result = run(['--source', 'microsoft-research'])
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([{ key: 'microsoft-research', method: 'rss',
      url: 'https://www.microsoft.com/en-us/research/feed/', articleAdapterAvailable: true, activated: false }])
  })
  it('plans the Romanian Ministry only when explicitly selected, without network or activation', () => {
    const result = run(['--source', 'ro-education'])
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([{ key: 'ro-education', method: 'rss',
      url: 'https://www.edu.ro/rss.xml', articleAdapterAvailable: true, activated: false }])
    const defaults = run([])
    expect(defaults.status).toBe(0)
    expect(JSON.parse(defaults.stdout).some((entry: { key: string }) => entry.key === 'ro-education')).toBe(false)
  })
  it('keeps the fixed paper-evidence probe offline by default and rejects non-staging network execution', () => {
    const script = 'flash-microsoft-paper-evidence-preview.ts'
    const plan = run([], script)
    expect(plan.status).toBe(0)
    expect(JSON.parse(plan.stdout)).toMatchObject({ maximumRequests: 4, providerCalled: false, activated: false })
    const probe = run(['--probe'], script)
    expect(probe.status).toBe(1)
    expect(probe.stdout).toBe('')
    expect(probe.stderr).toContain('FLASH_MICROSOFT_PAPER_EVIDENCE_PREVIEW_FAILED')
  })
  it('rejects unknown and duplicate source selections', () => {
    for (const args of [['--source', 'unknown'], ['--source', 'anthropic-news', '--source', 'openai-news']]) {
      const result = run(args)
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
    }
  })
  it('rejects the network probe outside the known staging runtime before requests', () => {
    for (const source of ['anthropic-news', 'microsoft-research', 'ro-education']) {
      const result = run(['--probe', '--source', source])
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('FLASH_FIRST_SOURCE_EXPANSION_PREVIEW_FAILED')
    }
  })
})
