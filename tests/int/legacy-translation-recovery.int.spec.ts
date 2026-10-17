import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const translator = readFileSync(resolve(process.cwd(), 'translator.ts'), 'utf8')
const recovery = readFileSync(resolve(process.cwd(), 'scripts/recover-legacy-translation.ts'), 'utf8')

describe('Legacy publisher translation recovery safeguards', () => {
  it('retries once rather than silently accepting malformed translated sections', () => {
    expect(translator).toContain('retryCount === 0 ? traduceArticol(articolRo, 1) : null')
    expect(translator).toContain('rawIndexes.length === expectedIndexes.length')
    expect(translator).toContain('expectedIndexes.every')
  })

  it('requires an explicit article ID and second confirmation before any write', () => {
    expect(recovery).toContain("if (apply && !confirmed)")
    expect(recovery).toContain("if (!apply) return")
    expect(recovery).toContain("source._status === 'published'")
    expect(recovery).toContain("if (linkedId || english.length > 1")
  })

  it('keeps recovered English article unpublished and in review, with reciprocal linking', () => {
    expect(recovery).toContain("draft: true")
    expect(recovery).toContain("editorialStatus: 'review'")
    expect(recovery).toContain("versiuneAlternativa: articleId")
    expect(recovery).toContain("data: { versiuneAlternativa: created.id }")
    expect(recovery).not.toContain("status: 'published'")
  })
})
