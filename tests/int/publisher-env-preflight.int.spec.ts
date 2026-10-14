import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
const script = path.resolve(repoRoot, 'scripts/publisher-env-preflight.mjs')
const workflow = readFileSync(
  path.resolve(repoRoot, '.github/workflows/publisher.yml'),
  'utf8',
)

// Synthetic values only. No live database, provider, or storage requests.
const validEnv = {
  NODE_ENV: 'production',
  ANTHROPIC_API_KEY: 'fake-anthropic-key-no-provider-requests',
  DATABASE_URL: 'postgresql://postgres.hyapqvnubhwkwmwudeit:fake-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
  PAYLOAD_SECRET: 'fake-payload-secret-no-runtime',
  MEDIA_PUBLIC_BASE_URL: 'https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media',
}

function preflight(overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...validEnv, ...overrides },
  })
}

describe('Auto-Publisher media URL preflight', () => {
  it('accepts a synthetic production configuration without external calls', () => {
    const run = preflight()
    expect(run.status).toBe(0)
    expect(run.stdout).toContain('PUBLISHER_ENV_PREFLIGHT_OK')
    expect(run.stderr).toBe('')
    for (const value of Object.values(validEnv)) {
      expect(run.stdout).not.toContain(value)
    }
  })

  it.each([
    'DATABASE_URL',
    'PAYLOAD_SECRET',
    'ANTHROPIC_API_KEY',
    'MEDIA_PUBLIC_BASE_URL',
  ])('fails closed when %s is missing, without exposing values', name => {
    const run = preflight({ [name]: '' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('PUBLISHER_ENV_PREFLIGHT_FAILED')
    expect(run.stderr).toContain(name)
    expect(run.stdout).not.toContain('PUBLISHER_ENV_PREFLIGHT_OK')
  })

  it('rejects the public media URL of staging, HTTP, other buckets and embedded credentials', () => {
    for (const unsafe of [
      'https://tvtnpcqawaekhmhyfrnc.supabase.co/storage/v1/object/public/media',
      'http://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media',
      'https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/other',
      'https://attacker:pw@hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media',
      'https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media?redirect=example',
    ]) {
      const run = preflight({ MEDIA_PUBLIC_BASE_URL: unsafe })
      expect(run.status).toBe(1)
      expect(run.stderr).toContain('MEDIA_PUBLIC_BASE_URL')
      expect(run.stderr).not.toContain(unsafe)
    }
  })

  it('rejects a staging database URI and a lookalike production database host', () => {
    for (const unsafe of [
      'postgresql://postgres.tvtnpcqawaekhmhyfrnc:an-unsafe-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
      'postgresql://postgres:fake-password@db.hyapqvnubhwkwmwudeit.supabase.co.attacker.example:5432/postgres',
    ]) {
      const run = preflight({ DATABASE_URL: unsafe })
      expect(run.status).toBe(1)
      expect(run.stderr).toContain('DATABASE_URL')
      expect(run.stderr).not.toContain(unsafe)
      expect(run.stderr).not.toContain('an-unsafe-password')
    }
  })

  it('accepts an official direct production Supabase database URI', () => {
    const run = preflight({
      DATABASE_URL: 'postgresql://postgres:fake-password@db.hyapqvnubhwkwmwudeit.supabase.co:5432/postgres',
    })
    expect(run.status).toBe(0)
  })

  it('requires production mode and rejects malformed DB URIs', () => {
    expect(preflight({ NODE_ENV: 'development' }).status).toBe(1)
    const run = preflight({ DATABASE_URL: 'not-a-database-uri' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('DATABASE_URL')
  })

  it('never leaks credentials in GitHub error annotations', () => {
    const marker = 'private-test-only-DONT-PRINT-this-value'
    const run = preflight({
      ANTHROPIC_API_KEY: marker,
      PAYLOAD_SECRET: marker,
      MEDIA_PUBLIC_BASE_URL: 'https://attacker.example/media',
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('::error::')
    expect(run.stderr).not.toContain(marker)
    expect(run.stdout).not.toContain(marker)
  })

  it('validates before npm install, repeats before publisher and keeps storage credentials out', () => {
    const preflightStepIndex = workflow.indexOf('name: Verifică înainte de instalare configurația media a publicatorului')
    const installIndex = workflow.indexOf('name: Instalează dependențe')
    const publisherStepIndex = workflow.indexOf('name: Rulează publisher-ul')
    expect(preflightStepIndex).toBeGreaterThan(-1)
    expect(preflightStepIndex).toBeLessThan(installIndex)
    expect(installIndex).toBeLessThan(publisherStepIndex)

    const preflightStep = workflow.slice(preflightStepIndex, installIndex)
    const publisherStep = workflow.slice(publisherStepIndex)
    const expectedBindings = [
      'ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
      'DATABASE_URL: ${{ secrets.DATABASE_URL }}',
      'PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET }}',
      'MEDIA_PUBLIC_BASE_URL: ${{ vars.MEDIA_PUBLIC_BASE_URL }}',
    ]
    for (const binding of expectedBindings) {
      expect(preflightStep).toContain(binding)
      expect(publisherStep).toContain(binding)
    }

    expect(preflightStep).toContain('node scripts/publisher-env-preflight.mjs')
    expect(publisherStep).toContain('node scripts/publisher-env-preflight.mjs')
    expect(publisherStep).toContain('npx tsx ${{ steps.decide.outputs.script }}')
    expect(workflow).not.toContain('S3_ACCESS_KEY_ID')
    expect(workflow).not.toContain('S3_SECRET_ACCESS_KEY')
    expect(workflow).not.toContain('S3_ENDPOINT')

    // Never provide secrets at job level or to npm ci.
    expect(workflow.slice(workflow.indexOf('jobs:'), preflightStepIndex))
      .not.toContain('ANTHROPIC_API_KEY')
    expect(workflow).toContain("cron: '0 5 * * *'")
    expect(workflow).toContain("cron: '0 11 * * *'")
    expect(workflow).toContain("cron: '0 13 * * *'")
    expect(workflow).toContain("cron: '0 17 * * *'")
  })
})
