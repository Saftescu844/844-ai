import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { flashPublicationExcerptProblem } from '@/lib/flash/ingestion/flashPublicationExcerptGuard'

describe('Flash AI excerpt publication gate', () => {
  const problem = (status: unknown, excerpt: unknown, prior: unknown = undefined) =>
    flashPublicationExcerptProblem({
      requestedStatus: status,
      proposedExcerpt: excerpt,
      priorExcerpt: prior,
    })

  it('rejects publication without a human-reviewed excerpt', () => {
    expect(problem('published', undefined)).toContain('requires')
    expect(problem('published', null, 'Previously approved')).toContain('requires')
    expect(problem('published', '  \n  ')).toContain('requires')
    expect(problem('published', 'x'.repeat(301))).toContain('300')
  })

  it('allows a valid excerpt and permitted reuse of an existing value', () => {
    expect(problem('published', 'Verified news summary')).toBeNull()
    expect(problem('published', undefined, 'Existing reviewed summary')).toBeNull()
    expect(problem('published', 'x'.repeat(300))).toBeNull()
  })

  it('does not gate draft review edits or silent updates to older published records', () => {
    expect(problem('draft', null)).toBeNull()
    expect(problem(undefined, null)).toBeNull()
  })

  it('is actually wired into the collection beforeChange publication hook', async () => {
    const code = await readFile(resolve('src/collections/FlashAI.ts'), 'utf8')
    expect(code).toContain('flashPublicationExcerptProblem({')
    expect(code).toContain('requestedStatus: data._status')
    expect(code).toContain('throw new APIError(excerptProblem, 400)')
  })
})

