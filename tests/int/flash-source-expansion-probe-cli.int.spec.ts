// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(args: string[]) {
  const env = { ...process.env }
  delete env.RAILWAY_PROJECT_ID
  delete env.RAILWAY_ENVIRONMENT_ID
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/flash-first-source-expansion-preview.ts', ...args],
    { encoding: 'utf8', env, timeout: 15_000 })
}

describe('Source-specific read-only probe CLI', () => {
  it('plans Anthropic only without contacting OpenAI or calling providers', () => {
    const result = run(['--source', 'anthropic-news'])
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([{ key: 'anthropic-news', method: 'html',
      url: 'https://www.anthropic.com/news', articleAdapterAvailable: true, activated: false }])
  })
  it('rejects unknown and duplicate source selections', () => {
    for (const args of [['--source', 'unknown'], ['--source', 'anthropic-news', '--source', 'openai-news']]) {
      const result = run(args)
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
    }
  })
  it('rejects the network probe outside the known staging runtime before requests', () => {
    const result = run(['--probe', '--source', 'anthropic-news'])
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('FLASH_FIRST_SOURCE_EXPANSION_PREVIEW_FAILED')
  })
})
