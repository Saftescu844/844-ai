import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { prepareEnglishDraft, translateArticleHandler } from '../../src/endpoints/translateArticle'

function setup() {
  const source = { id: 10, titlu: 'Articol', excerpt: 'Rezumat', continut: { root: { children: [] } },
    limba: 'ro', updatedAt: '2026-11-20T12:00:00Z', pilon: 1, tip: 'analiza',
    autorPrincipal: 8, surse: [3], _status: 'published', editorialStatus: 'approved' }
  const execute = vi.fn().mockResolvedValue({ rows: [{ id: 10 }] })
  const payload = {
    findByID: vi.fn().mockResolvedValue(source),
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    create: vi.fn().mockResolvedValue({ id: 11 }),
    update: vi.fn().mockResolvedValue({ id: 10 }),
    db: { beginTransaction: vi.fn().mockResolvedValue('tx'), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(), sessions: { tx: { db: { execute } } } },
  }
  const translate = vi.fn().mockResolvedValue({ titlu: 'Article', excerpt: 'Summary', continut: source.continut, metaTitle: 'Article', metaDescription: 'Summary' })
  const req = { payload, user: { id: 1, rol: 'editor' }, headers: new Headers(), url: 'https://example.org/api/articole/10/prepare-english', routeParams: { id: '10' } } as unknown as PayloadRequest
  return { source, payload, execute, translate, req }
}

describe('Prepare English draft', () => {
  beforeEach(() => vi.unstubAllEnvs())

  it('creates only a review draft, retains attribution and links both editions in one transaction', async () => {
    const t = setup()
    expect(await prepareEnglishDraft(t.req, 10, t.translate)).toEqual({ englishId: 11, created: true })
    expect(t.payload.create).toHaveBeenCalledWith(expect.objectContaining({ draft: true, req: t.req, overrideAccess: false,
      data: expect.objectContaining({ _status: 'draft', editorialStatus: 'review', autorPrincipal: 8, versiuneAlternativa: 10 }) }))
    expect(t.payload.update).toHaveBeenCalledWith(expect.objectContaining({ draft: true, req: t.req, overrideAccess: false,
      data: expect.objectContaining({ versiuneAlternativa: 11, necesitaRetraducere: false }) }))
    expect(t.execute).toHaveBeenCalledOnce()
    expect(t.payload.db.commitTransaction).toHaveBeenCalledWith('tx')
    expect(t.payload.db.rollbackTransaction).not.toHaveBeenCalled()
    expect(t.translate.mock.invocationCallOrder[0]).toBeLessThan(t.payload.db.beginTransaction.mock.invocationCallOrder[0])
  })

  it('does not regenerate or overwrite an existing edition', async () => {
    const t = setup()
    t.payload.findByID.mockResolvedValue({ ...t.source, versiuneAlternativa: 11 })
    expect(await prepareEnglishDraft(t.req, 10, t.translate)).toEqual({ englishId: 11, created: false })
    expect(t.translate).not.toHaveBeenCalled()
    expect(t.payload.create).not.toHaveBeenCalled()
  })

  it('rolls back if the RO backlink cannot be saved', async () => {
    const t = setup()
    t.payload.update.mockRejectedValue(new Error('write failure'))
    await expect(prepareEnglishDraft(t.req, 10, t.translate)).rejects.toThrow('write failure')
    expect(t.payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
    expect(t.payload.db.commitTransaction).not.toHaveBeenCalled()
  })

  it('rejects a concurrent source edit before creating anything', async () => {
    const t = setup()
    t.payload.findByID.mockResolvedValueOnce(t.source).mockResolvedValueOnce({ ...t.source, updatedAt: 'changed' })
    await expect(prepareEnglishDraft(t.req, 10, t.translate)).rejects.toThrow('modificat')
    expect(t.payload.create).not.toHaveBeenCalled()
    expect(t.payload.db.rollbackTransaction).toHaveBeenCalledOnce()
  })

  it('aborts on an ambiguous reverse link and incomplete provider result', async () => {
    const t = setup()
    t.payload.find.mockResolvedValueOnce({ totalDocs: 1, docs: [] })
    await expect(prepareEnglishDraft(t.req, 10, t.translate)).rejects.toThrow('asociată invers')
    expect(t.translate).not.toHaveBeenCalled()
    t.translate.mockResolvedValue(null)
    await expect(prepareEnglishDraft(t.req, 10, t.translate)).rejects.toThrow('nu este completă')
    expect(t.payload.db.beginTransaction).not.toHaveBeenCalled()
  })

  it('denies unauthenticated/read-only and cross-origin requests before touching data', async () => {
    const t = setup()
    t.req.user = { rol: 'cititor' } as any
    expect((await translateArticleHandler(t.req)).status).toBe(403)
    await expect(prepareEnglishDraft(t.req, 10, t.translate)).rejects.toThrow('Acces rezervat')
    t.req.user = { rol: 'admin' } as any
    vi.stubEnv('SITE_URL', 'https://example.org')
    t.req.headers.set('origin', 'https://other.org')
    expect((await translateArticleHandler(t.req)).status).toBe(403)
    expect(t.payload.findByID).not.toHaveBeenCalled()
  })
})
