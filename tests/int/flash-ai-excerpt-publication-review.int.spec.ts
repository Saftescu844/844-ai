import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  flashPublicationExcerptProblem,
} from '@/lib/flash/ingestion/flashPublicationExcerptGuard'

describe('Flash AI excerpt publication gate (production candidate)', () => {
  const problem = (status: unknown, excerpt: unknown, prior: unknown = undefined) =>
    flashPublicationExcerptProblem({
      requestedStatus: status,
      proposedExcerpt: excerpt,
      priorExcerpt: prior,
    })

  it('refuses publication with a missing, blank, or overlong excerpt', () => {
    expect(problem('published', undefined)).toContain('requires')
    expect(problem('published', null, 'Previously approved')).toContain('requires')
    expect(problem('published', '  \\n  ')).toContain('requires')
    expect(problem('published', 'x'.repeat(301))).toContain('300')
  })

  it('permits publication with a valid excerpt or a previously reviewed excerpt', () => {
    expect(problem('published', 'Verified news summary')).toBeNull()
    expect(problem('published', undefined, 'Existing reviewed summary')).toBeNull()
    expect(problem('published', 'x'.repeat(300))).toBeNull()
  })

  it('allows legacy draft edits without making excerpt globally required', () => {
    expect(problem('draft', null)).toBeNull()
    expect(problem(undefined, null)).toBeNull()
  })

  it('is wired into the pre-publication collection hook', async () => {
    const code = await readFile(resolve('src/collections/FlashAI.ts'), 'utf8')
    expect(code).toContain('flashPublicationExcerptProblem({')
    expect(code).toContain('requestedStatus: data._status')
    expect(code).toContain('throw new APIError(excerptProblem, 400)')
  })
})
