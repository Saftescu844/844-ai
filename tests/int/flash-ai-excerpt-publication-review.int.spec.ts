import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  flashPublicationExcerptProblem,
} from '@/lib/flash/ingestion/flashPublicationExcerptGuard'
import {
  proposeFlashExcerptFromLexical,
} from '@/lib/flash/ingestion/flashExcerptReviewPreview'
import {
  buildFlashEditorialLexicalContent,
} from '@/lib/flash/editorialContentLexical'

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

describe('Flash AI legacy excerpt preview (never a writer)', () => {
  it('proposes existing lead text but always demands human review', () => {
    const lead = 'Research teams report initial results using verified experiments and clearly state what is known about the method.'
    const res = proposeFlashExcerptFromLexical(buildFlashEditorialLexicalContent([lead]))
    expect(res).toEqual({
      candidate: lead,
      reason: 'editorial_review_required',
    })
  })

  it('takes complete sentences only; refuses unsupported or short bodies', () => {
    const one = 'A carefully documented observation offers limited but useful evidence about the tested system and does not establish broad safety.'
    const two = 'Researchers say more verification is needed before practical use or deployment is justified.'
    const long = [one, two, 'More context '.repeat(30)].join(' ')
    const valid = proposeFlashExcerptFromLexical(buildFlashEditorialLexicalContent([long]))
    expect(valid.candidate).toBe(one + ' ' + two)
    expect(valid.reason).toBe('editorial_review_required')
    expect(proposeFlashExcerptFromLexical({})).toMatchObject({ candidate: null })
    expect(proposeFlashExcerptFromLexical(buildFlashEditorialLexicalContent(['Too short.']))).toMatchObject({ candidate: null })
  })

  it('restricts CLI to staging and prohibits writes/provider requests', async () => {
    const script = await readFile(resolve('scripts/flash-ai-staging-excerpt-preview.ts'), 'utf8')
    expect(script).toContain('PAYLOAD_DB_PUSH')
    expect(script).toContain('RAILWAY_PROJECT_ID')
    expect(script).toContain('assertFlashAiStagingWriteAllowed')
    expect(script).toContain("draft: true")
    expect(script).toContain('writeAttempted: false')
    expect(script).toContain('requiredAction:')
    expect(script).not.toMatch(/\bpayload\.(?:update|create|delete)\s*\(/)
    expect(script).not.toContain('allow-provider-requests')
    expect(script).not.toContain('openai')
  })
})
