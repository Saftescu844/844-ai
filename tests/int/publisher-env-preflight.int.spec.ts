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

// Synthetic values only. These are NEVER production/staging credentials.
const validEnv = {
  NODE_ENV: 'production',
  ANTHROPIC_API_KEY: 'fake-anthropic-key-no-provider-requests',
  DATABASE_URL: 'postgresql://postgres.hyapqvnubhwkwmwudeit:fake-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
  PAYLOAD_SECRET: 'fake-payload-secret-no-runtime',
  MEDIA_PUBLIC_BASE_URL: 'https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media',
  S3_BUCKET: 'media',
  S3_REGION: 'eu-central-1',
  S3_ENDPOINT: 'https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/s3',
  S3_ACCESS_KEY_ID: 'fake-s3-access-id',
  S3_SECRET_ACCESS_KEY: 'fake-s3-secret-key',
}

function preflight(overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...validEnv, ...overrides },
  })
}

describe('Auto-Publisher production media environment preflight', () => {
  it('passes a self-contained synthetic production configuration without network access', () => {
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
    'S3_BUCKET',
    'S3_REGION',
    'S3_ENDPOINT',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ])('fails closed when %s is missing, without logging its value', name => {
    const run = preflight({ [name]: '' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('PUBLISHER_ENV_PREFLIGHT_FAILED')
    expect(run.stderr).toContain(name)
    expect(run.stdout).not.toContain('PUBLISHER_ENV_PREFLIGHT_OK')
  })

  it('fails closed if the public media URL points to staging or is not HTTPS', () => {
    for (const unsafe of [
      'https://tvtnpcqawaekhmhyfrnc.supabase.co/storage/v1/object/public/media',
      'http://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media',
      'https://hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/other',
      'https://attacker:pw@hyapqvnubhwkwmwudeit.supabase.co/storage/v1/object/public/media',
    ]) {
      const run = preflight({ MEDIA_PUBLIC_BASE_URL: unsafe })
      expect(run.status).toBe(1)
      expect(run.stderr).toContain('MEDIA_PUBLIC_BASE_URL')
      expect(run.stderr).not.toContain(unsafe)
    }
  })

  it('blocks S3 endpoint cross-wiring to staging and incorrect buckets', () => {
    const stage = preflight({
      S3_ENDPOINT: 'https://tvtnpcqawaekhmhyfrnc.supabase.co/storage/v1/s3',
    })
    expect(stage.status).toBe(1)
    expect(stage.stderr).toContain('S3_ENDPOINT')

    const bucket = preflight({ S3_BUCKET: 'staging-media' })
    expect(bucket.status).toBe(1)
    expect(bucket.stderr).toContain('S3_BUCKET')
  })

  it('accepts the alternative official direct Supabase S3 endpoint on the same production project', () => {
    const run = preflight({
      S3_ENDPOINT: 'https://hyapqvnubhwkwmwudeit.storage.supabase.co/storage/v1/s3',
    })
    expect(run.status).toBe(0)
    expect(run.stdout).toContain('PUBLISHER_ENV_PREFLIGHT_OK')
  })

  it('rejects a staging database reference without displaying credentials', () => {
    const stagingUrl = 'postgresql://postgres.tvtnpcqawaekhmhyfrnc:an-unsafe-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
    const run = preflight({ DATABASE_URL: stagingUrl })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('DATABASE_URL')
    expect(run.stderr).not.toContain(stagingUrl)
    expect(run.stderr).not.toContain('an-unsafe-password')
  })

  it('rejects lookalike database hosts even if they contain the production project ID', () => {
    const spoofedUrl = 'postgresql://postgres:fake-password@db.hyapqvnubhwkwmwudeit.supabase.co.attacker.example:5432/postgres'
    const run = preflight({ DATABASE_URL: spoofedUrl })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('DATABASE_URL')
    expect(run.stderr).not.toContain(spoofedUrl)
  })

  it('requires the documented production S3 region', () => {
    const run = preflight({ S3_REGION: 'us-east-1' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('S3_REGION')
  })

  it('requires production mode and rejects malformed database URLs', () => {
    expect(preflight({ NODE_ENV: 'development' }).status).toBe(1)
    const run = preflight({ DATABASE_URL: 'not-a-database-uri' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('DATABASE_URL')
  })

  it('never exposes secret strings or endpoints in GitHub error annotations', () => {
    const marker = 'private-test-only-DONT-PRINT-this-value'
    const run = preflight({
      ANTHROPIC_API_KEY: marker,
      S3_SECRET_ACCESS_KEY: marker,
      MEDIA_PUBLIC_BASE_URL: 'https://attacker.example/media',
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('::error::')
    expect(run.stderr).not.toContain(marker)
    expect(run.stdout).not.toContain(marker)
  })

  it('wires each required variable in both steps, with preflight before dependency installation', () => {
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
      'S3_BUCKET: ${{ vars.S3_BUCKET }}',
      'S3_REGION: ${{ vars.S3_REGION }}',
      'S3_ENDPOINT: ${{ vars.S3_ENDPOINT }}',
      'S3_ACCESS_KEY_ID: ${{ secrets.S3_ACCESS_KEY_ID }}',
      'S3_SECRET_ACCESS_KEY: ${{ secrets.S3_SECRET_ACCESS_KEY }}',
    ]
    for (const binding of expectedBindings) {
      expect(preflightStep).toContain(binding)
      expect(publisherStep).toContain(binding)
    }
    expect(preflightStep).toContain('node scripts/publisher-env-preflight.mjs')
    expect(publisherStep).toContain('node scripts/publisher-env-preflight.mjs')
    expect(publisherStep).toContain('npx tsx ${{ steps.decide.outputs.script }}')

    // No job-level secret environment: dependency installation is isolated.
    expect(workflow.slice(workflow.indexOf('jobs:'), preflightStepIndex))
      .not.toContain('S3_SECRET_ACCESS_KEY')
    expect(workflow).toContain("cron: '0 5 * * *'")
    expect(workflow).toContain("cron: '0 11 * * *'")
    expect(workflow).toContain("cron: '0 13 * * *'")
    expect(workflow).toContain("cron: '0 17 * * *'")
  })
})
