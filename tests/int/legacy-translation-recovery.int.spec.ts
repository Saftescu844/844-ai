import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { recoverLegacyTranslation } from '../../scripts/legacy-translation-recovery-core'

function setup(overrides: {
  reverse?: Array<Record<string, any>>
  bySource?: Array<Record<string, any>>
  published?: boolean
  updatedDuringTranslation?: boolean
  translationFails?: boolean
} = {}) {
  const ro = {
    id: 1066, titlu: 'Titlu românesc', limba: 'ro', _status: 'draft',
    editorialStatus: 'review', generatAutomat: true,
    versiuneAlternativa: null, pilon: 2, tip: 'stire-auto',
    excerpt: 'Rezumat RO', continut: { root: { children: [] } },
    sursaNume: 'Test', sursaLink: 'https://example.com/origin',
    tags: [{ tag: 'AI' }], numarConfirmari: 1,
    createdAt: '2026-10-17T09:00:00Z', updatedAt: '2026-10-17T09:00:00Z',
  }
  let readCount = 0
  const findByID = vi.fn(async ({ id, draft }: { id: number, draft: boolean }) => {
    if (id !== 1066) return { ...ro, id, limba: 'en', _status: 'draft' }
    if (!draft) return { ...ro, _status: overrides.published ? 'published' : 'draft' }
    readCount++
    return {
      ...ro,
      updatedAt: overrides.updatedDuringTranslation && readCount > 1
        ? '2026-10-17T10:00:00Z'
        : ro.updatedAt,
    }
  })
  const find = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
    const docs = 'and' in where ? (overrides.bySource ?? []) : (overrides.reverse ?? [])
    return { docs, totalDocs: docs.length }
  })
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data, id: 2222,
  }))
  const update = vi.fn(async () => ({ ...ro }))
  const translate = vi.fn(async () => overrides.translationFails
    ? null
    : {
        titlu: 'English title', excerpt: 'English excerpt',
        continut: { root: { children: [{ type: 'paragraph' }] } },
        metaTitle: 'English title', metaDescription: 'Description',
      })
  const payload = { findByID, find, create, update } as unknown as Payload
  return {
    deps: { payload, translate, slugEnglish: () => 'english-slug' },
    findByID, find, create, update, translate,
  }
}

describe('Legacy RO -> EN translation recovery (mocked; no DB or AI requests)', () => {
  it('dry-run never translates or writes; identifies missing EN', async () => {
    const t = setup()
    await expect(recoverLegacyTranslation(t.deps, 1066, false)).resolves.toEqual({
      kind: 'dry-run', articleId: 1066, existingEnglishId: null,
    })
    expect(t.translate).not.toHaveBeenCalled()
    expect(t.create).not.toHaveBeenCalled()
    expect(t.update).not.toHaveBeenCalled()
  })

  it('creates only an EN review draft, then reciprocally links RO', async () => {
    const t = setup()
    await expect(recoverLegacyTranslation(t.deps, 1066, true)).resolves.toEqual({
      kind: 'created', articleId: 1066, englishId: 2222,
    })
    expect(t.create).toHaveBeenCalledTimes(1)
    const args = t.create.mock.calls[0][0] as any
    expect(args.collection).toBe('articole')
    expect(args.draft).toBe(true)
    expect(args.data).toMatchObject({
      limba: 'en', editorialStatus: 'review', versiuneAlternativa: 1066,
      generatAutomat: true, tags: [{ tag: 'AI' }], numarConfirmari: 1,
    })
    expect(t.update).toHaveBeenCalledTimes(1)
    expect(t.update.mock.calls[0][0]).toMatchObject({
      id: 1066, draft: true, data: { versiuneAlternativa: 2222 },
    })
  })

  it('repairs an existing reverse-linked EN draft without retranslating or duplicating', async () => {
    const partner = { id: 2001, limba: 'en', _status: 'draft', versiuneAlternativa: 1066 }
    const t = setup({ reverse: [partner], bySource: [partner] })
    await expect(recoverLegacyTranslation(t.deps, 1066, true)).resolves.toMatchObject({
      kind: 'relinked', englishId: 2001,
    })
    expect(t.translate).not.toHaveBeenCalled()
    expect(t.create).not.toHaveBeenCalled()
    expect(t.update).toHaveBeenCalledOnce()
  })

  it('rejects a competing unlinked EN draft with the same source URL', async () => {
    const t = setup({ bySource: [{ id: 2001, limba: 'en' }] })
    await expect(recoverLegacyTranslation(t.deps, 1066, true))
      .rejects.toThrow('same source URL')
    expect(t.create).not.toHaveBeenCalled()
  })

  it('rejects published or otherwise ineligible originals', async () => {
    const t = setup({ published: true })
    await expect(recoverLegacyTranslation(t.deps, 1066, true))
      .rejects.toThrow('unpublished')
    expect(t.translate).not.toHaveBeenCalled()
  })

  it('does not create EN if RO was edited while the model translated', async () => {
    const t = setup({ updatedDuringTranslation: true })
    await expect(recoverLegacyTranslation(t.deps, 1066, true))
      .rejects.toThrow('changed during translation')
    expect(t.create).not.toHaveBeenCalled()
  })

  it('does not create EN when the translation is incomplete', async () => {
    const t = setup({ translationFails: true })
    await expect(recoverLegacyTranslation(t.deps, 1066, true))
      .rejects.toThrow('Translation incomplete')
    expect(t.create).not.toHaveBeenCalled()
  })

  it('rejects ambiguous reverse links', async () => {
    const t = setup({ reverse: [{ id: 2001, limba: 'en' }, { id: 2002, limba: 'en' }] })
    await expect(recoverLegacyTranslation(t.deps, 1066, true))
      .rejects.toThrow('Ambiguous reverse')
    expect(t.create).not.toHaveBeenCalled()
  })
})

describe('Translator and CLI safeguards', () => {
  it('translator retries incomplete response once and checks all text blocks', () => {
    const text = readFileSync(resolve(process.cwd(), 'translator.ts'), 'utf8')
    expect(text).toContain('retryCount === 0 ? traduceArticol(articolRo, 1) : null')
    expect(text).toContain('rawIndexes.length === expectedIndexes.length')
    expect(text).toContain('expectedIndexes.every')
  })

  it('CLI needs explicit apply confirmation, lock and push protection', () => {
    const text = readFileSync(
      resolve(process.cwd(), 'scripts/recover-legacy-translation.ts'), 'utf8')
    expect(text).toContain("if (apply && !process.argv.includes")
    expect(text).toContain("PAYLOAD_DB_PUSH !== 'false'")
    expect(text).toContain('pg_try_advisory_lock')
    expect(text).toContain('pg_advisory_unlock')
    expect(text).toContain('if (!apply)')
  })
})
