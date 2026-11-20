import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { applyEnglishRetranslation, previewEnglishRetranslation,
  applyEnglishRetranslationHandler, previewEnglishRetranslationHandler } from '../../src/endpoints/retranslateArticle'

function setup() {
  const content = { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Source' }] }] } }
  const source = { id: 10, titlu: 'RO nou', excerpt: 'Rezumat', continut: content,
    limba: 'ro', updatedAt: 'source-v1', versiuneAlternativa: 11, _status: 'draft', necesitaRetraducere: true }
  const target = { id: 11, titlu: 'EN manually corrected', excerpt: 'Manual summary', continut: content,
    limba: 'en', updatedAt: 'target-v1', versiuneAlternativa: 10, slug: 'keep-this-url', _status: 'published', editorialStatus: 'approved' }
  const payload = {
    config: { secret: 'unit-test-signing-secret' },
    findByID: vi.fn(async ({ id }: { id: number }) => id === 10 ? source : target),
    create: vi.fn(), update: vi.fn().mockResolvedValue({}),
    db: { beginTransaction: vi.fn().mockResolvedValue('tx'), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(),
      sessions: { tx: { db: { execute: vi.fn().mockResolvedValue({ rows: [] }) } } } },
  }
  const proposal = { titlu: 'New English draft', excerpt: 'New summary', continut: content,
    metaTitle: 'SEO', metaDescription: 'Description', tags: [{ tag: 'Health' }] }
  const translate = vi.fn().mockResolvedValue(proposal)
  const req = { payload, user: { id: 1, collection: 'useri', rol: 'editor' },
    headers: new Headers({ origin: 'https://example.org' }), url: 'https://example.org/api/articole/10/retranslate-english-preview',
    routeParams: { id: '10' } } as unknown as PayloadRequest
  return { source, target, payload, proposal, translate, req }
}

describe('Reviewed EN retranslation', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllEnvs() })

  it('returns current corrections and a signed proposal without saving or creating any article', async () => {
    const t = setup()
    const result = await previewEnglishRetranslation(t.req, 10, t.translate)
    expect(result.current.titlu).toBe('EN manually corrected')
    expect(result.proposal.titlu).toBe('New English draft')
    expect(result.token.split('.')).toHaveLength(2)
    expect(t.payload.create).not.toHaveBeenCalled()
    expect(t.payload.update).not.toHaveBeenCalled()
    expect(t.payload.db.beginTransaction).not.toHaveBeenCalled()
  })

  it('applies only after review to the same EN draft, keeps slug/authorship and clears RO stale state atomically', async () => {
    const t = setup()
    const review = await previewEnglishRetranslation(t.req, 10, t.translate)
    expect(await applyEnglishRetranslation(t.req, 10, review)).toEqual({ englishId: 11, applied: true })
    expect(t.payload.update).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: 11, draft: true, req: t.req, overrideAccess: false,
      data: expect.objectContaining({ titlu: 'New English draft', _status: 'draft', editorialStatus: 'review' }),
    }))
    const data = t.payload.update.mock.calls[0][0].data
    expect(data).not.toHaveProperty('slug')
    expect(data).not.toHaveProperty('autorPrincipal')
    expect(data).not.toHaveProperty('versiuneAlternativa')
    expect(data).not.toHaveProperty('videoUrl')
    expect(data.verificatorEditorial).toBeNull()
    expect(data.verificatorMedical).toBeNull()
    expect(t.payload.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 10,
      data: expect.objectContaining({ necesitaRetraducere: false }) }))
    expect(t.payload.db.commitTransaction).toHaveBeenCalledWith('tx')
    expect(t.payload.create).not.toHaveBeenCalled()
    expect(t.translate).toHaveBeenCalledOnce()
  })

  it.each(['source', 'target'] as const)('preserves edits to %s made after preview', async key => {
    const t = setup()
    const review = await previewEnglishRetranslation(t.req, 10, t.translate)
    t[key].titlu += ' changed'
    await expect(applyEnglishRetranslation(t.req, 10, review)).rejects.toThrow('s-a schimbat')
    expect(t.payload.update).not.toHaveBeenCalled()
    expect(t.payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
  })

  it('rejects an article changed while the provider prepares the proposal', async () => {
    const t = setup()
    t.translate.mockImplementation(async () => { t.target.updatedAt = 'edited-during-request'; return t.proposal })
    await expect(previewEnglishRetranslation(t.req, 10, t.translate)).rejects.toThrow('în timpul traducerii')
    expect(t.payload.update).not.toHaveBeenCalled()
  })

  it('rejects a changed proposal, forged token or use against another article before opening a transaction', async () => {
    const t = setup()
    const review = await previewEnglishRetranslation(t.req, 10, t.translate)
    await expect(applyEnglishRetranslation(t.req, 10, { ...review, proposal: { ...review.proposal, titlu: 'Tampered' } })).rejects.toThrow('modificată')
    await expect(applyEnglishRetranslation(t.req, 10, { ...review, token: review.token + 'x' })).rejects.toThrow('verificată')
    await expect(applyEnglishRetranslation(t.req, 12, review)).rejects.toThrow('nu corespunde')
    expect(t.payload.db.beginTransaction).not.toHaveBeenCalled()
  })

  it('binds the proposal to the editor and expires it after ten minutes', async () => {
    vi.useFakeTimers()
    const t = setup()
    const review = await previewEnglishRetranslation(t.req, 10, t.translate)
    t.req.user!.id = 2
    await expect(applyEnglishRetranslation(t.req, 10, review)).rejects.toThrow('altei sesiuni')
    t.req.user!.id = 1
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    await expect(applyEnglishRetranslation(t.req, 10, review)).rejects.toThrow('expirat')
    expect(t.payload.update).not.toHaveBeenCalled()
  })

  it('rejects replay after the EN revision changed', async () => {
    const t = setup()
    const review = await previewEnglishRetranslation(t.req, 10, t.translate)
    await applyEnglishRetranslation(t.req, 10, review)
    t.target.updatedAt = 'saved-v2'
    await expect(applyEnglishRetranslation(t.req, 10, review)).rejects.toThrow('s-a schimbat')
    expect(t.payload.update).toHaveBeenCalledTimes(2)
  })

  it('rolls back EN changes if updating the RO synchronization marker fails', async () => {
    const t = setup()
    const review = await previewEnglishRetranslation(t.req, 10, t.translate)
    t.payload.update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Synthetic marker failure'))
    await expect(applyEnglishRetranslation(t.req, 10, review)).rejects.toThrow('Synthetic marker failure')
    expect(t.payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
    expect(t.payload.db.commitTransaction).not.toHaveBeenCalled()
  })

  it('refuses ambiguous relationships and incomplete provider output', async () => {
    const t = setup()
    t.target.versiuneAlternativa = 99
    await expect(previewEnglishRetranslation(t.req, 10, t.translate)).rejects.toThrow('Legăturile')
    expect(t.translate).not.toHaveBeenCalled()
    t.target.versiuneAlternativa = 10
    t.translate.mockResolvedValue(null)
    await expect(previewEnglishRetranslation(t.req, 10, t.translate)).rejects.toThrow('nu este completă')
    expect(t.payload.update).not.toHaveBeenCalled()
  })

  it('denies unauthorized/cross-origin HTTP requests before reading articles', async () => {
    const t = setup()
    t.req.user = null
    expect((await previewEnglishRetranslationHandler(t.req)).status).toBe(403)
    t.req.user = { id: 1, rol: 'editor', collection: 'useri' } as any
    t.req.headers.set('origin', 'https://other.org')
    vi.stubEnv('SITE_URL', 'https://example.org')
    expect((await applyEnglishRetranslationHandler(t.req)).status).toBe(403)
    expect(t.payload.findByID).not.toHaveBeenCalled()
  })
})
