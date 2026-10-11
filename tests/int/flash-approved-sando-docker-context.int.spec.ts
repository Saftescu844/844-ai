import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SANDO_APPROVED_MANUSCRIPTS,
} from '@/lib/flash/ingestion/approvedSandoEditorial'

const dockerignorePath = resolve(
  process.cwd(),
  'Dockerfile.flash-engine-worker.dockerignore',
)
const dockerfilePath = resolve(
  process.cwd(),
  'Dockerfile.flash-engine-worker',
)

describe('Worker Docker context for approved SANDO staging importer', () => {
  it('includes both approved manuscripts with parent-directory exceptions', async () => {
    const rules = (await readFile(dockerignorePath, 'utf8'))
      .split('\n')
      .map(rule => rule.trim())
      .filter(rule => rule.length > 0 && !rule.startsWith('#'))

    expect(rules[0]).toBe('*')

    const parentIndex = rules.indexOf('!content/')
    const approvedDirectoryIndex = rules.indexOf('!content/flash-approved/')
    const scopedExclusionIndex = rules.indexOf('content/flash-approved/*')
    expect(parentIndex).toBeGreaterThan(0)
    expect(approvedDirectoryIndex).toBeGreaterThan(parentIndex)
    expect(scopedExclusionIndex).toBeGreaterThan(approvedDirectoryIndex)

    const expectedExceptions = Object.values(SANDO_APPROVED_MANUSCRIPTS)
      .map(manuscript => `!${manuscript.path}`)
    const actualExceptions = rules.filter(rule =>
      rule.startsWith('!content/flash-approved/') &&
      rule !== '!content/flash-approved/',
    )
    expect(actualExceptions.sort()).toEqual(expectedExceptions.sort())

    for (const manuscript of Object.values(SANDO_APPROVED_MANUSCRIPTS)) {
      expect(rules.lastIndexOf(`!${manuscript.path}`))
        .toBeGreaterThan(scopedExclusionIndex)
      expect(await readFile(resolve(process.cwd(), manuscript.path), 'utf8'))
        .toContain(manuscript.title)
    }

    // No recursive content wildcard or inclusion of editorial notes/other
    // articles: the only permitted files are the two approved manuscripts.
    expect(rules).not.toContain('!content/**')
    expect(rules).not.toContain('!content/flash-approved/**')
    expect(rules).not.toContain('!content/flash-approved/*')
    expect(rules).not.toContain('!content/flash-approved/README.md')
  })

  it('uses the same Dockerfile and copies the narrowly included context', async () => {
    const dockerfile = await readFile(dockerfilePath, 'utf8')
    expect(dockerfile).toContain('COPY . .')
    expect(dockerfile).toContain('WORKDIR /app')
    expect(dockerfile).not.toContain('COPY content/flash-approved')
    expect(dockerfile).not.toContain('RUN curl')
  })
})
