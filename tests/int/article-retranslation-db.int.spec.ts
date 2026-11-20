import { describe, expect, it, vi } from 'vitest'
import { createLocalReq, getPayload } from 'payload'
import config from '@/payload.config'
import { prepareEnglishDraft } from '../../src/endpoints/translateArticle'
import { applyEnglishRetranslation, previewEnglishRetranslation } from '../../src/endpoints/retranslateArticle'

const content = { root: { type: 'root', format: '', indent: 0, version: 1, children: [
  { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: 'CI translation fixture', format: 1, version: 1 }] },
] } }
const isolatedCI = process.env.CI === 'true' && process.env.DATABASE_URL?.includes('127.0.0.1:5432/ci')

describe('Reviewed retranslation with real Payload versions and PostgreSQL', () => {
  it.skipIf(!isolatedCI)('preserves a published EN, retains history, rejects stale proposals and rolls back partial writes', async () => {
    const payload = await getPayload({ config: await config })
    const request = (rol: 'admin' | 'editor' = 'admin') => createLocalReq({
      user: { id: 1, collection: 'useri', rol, email: 'fixture@example.invalid' } as any,
    }, payload)
    const key = `retranslation-ci-${Date.now()}-${process.pid}`
    const category = await payload.create({ collection: 'categorii', data: { nume: 'Retranslation CI', slug: key, pilon: 'sanatate' } })
    const source = await payload.create({ collection: 'articole', draft: true, req: await request(), data: {
      titlu: 'Articol test', slug: key, limba: 'ro', pilon: category.id, tip: 'analiza',
      excerpt: 'Rezumat de test', continut: content as never, editorialStatus: 'review',
    } })
    const translate = vi.fn(async () => ({ titlu: 'Proposed EN', excerpt: 'Proposed summary', continut: content,
      metaTitle: 'EN SEO', metaDescription: 'English description' }))
    const pair = await prepareEnglishDraft(await request(), source.id, translate)
    await payload.update({ collection: 'articole', id: pair.englishId, req: await request(), data: {
      titlu: 'Manually corrected published EN', _status: 'published', editorialStatus: 'approved',
    } })
    const liveBefore = await payload.findByID({ collection: 'articole', id: pair.englishId, draft: false, depth: 0 })
    expect(liveBefore._status).toBe('published')
    const versionsBefore = await payload.findVersions({ collection: 'articole', where: { parent: { equals: pair.englishId } }, limit: 100 })
    const review = await previewEnglishRetranslation(await request('editor'), source.id, translate)
    expect(review.current.titlu).toBe('Manually corrected published EN')
    expect((await payload.findByID({ collection: 'articole', id: pair.englishId, draft: true })).titlu).toBe(review.current.titlu)
    await applyEnglishRetranslation(await request('editor'), source.id, review)
    const savedDraft = await payload.findByID({ collection: 'articole', id: pair.englishId, draft: true, depth: 0 })
    const liveAfter = await payload.findByID({ collection: 'articole', id: pair.englishId, draft: false, depth: 0 })
    expect(savedDraft).toMatchObject({ titlu: 'Proposed EN', _status: 'draft', editorialStatus: 'review', slug: liveBefore.slug, versiuneAlternativa: source.id })
    expect(liveAfter).toMatchObject({ titlu: liveBefore.titlu, _status: 'published', continut: liveBefore.continut })
    const versionsAfter = await payload.findVersions({ collection: 'articole', where: { parent: { equals: pair.englishId } }, limit: 100 })
    expect(versionsAfter.totalDocs).toBeGreaterThan(versionsBefore.totalDocs)
    expect(versionsAfter.docs.some(version => version.version.titlu === liveBefore.titlu)).toBe(true)
    await expect(applyEnglishRetranslation(await request('editor'), source.id, review)).rejects.toThrow('s-a schimbat')

    const stale = await previewEnglishRetranslation(await request('editor'), source.id, translate)
    await payload.update({ collection: 'articole', id: pair.englishId, draft: true, req: await request('editor'), data: { titlu: 'New manual EN correction' } })
    await expect(applyEnglishRetranslation(await request('editor'), source.id, stale)).rejects.toThrow('s-a schimbat')
    expect((await payload.findByID({ collection: 'articole', id: pair.englishId, draft: true })).titlu).toBe('New manual EN correction')

    const rollbackReview = await previewEnglishRetranslation(await request('editor'), source.id, translate)
    const originalUpdate = payload.update.bind(payload)
    const update = vi.spyOn(payload, 'update').mockImplementation(async (args: any) => {
      if (args.collection === 'articole' && args.id === source.id) throw new Error('Synthetic source marker failure')
      return originalUpdate(args) as any
    })
    try {
      await expect(applyEnglishRetranslation(await request('editor'), source.id, rollbackReview)).rejects.toThrow('Synthetic source marker failure')
    } finally { update.mockRestore() }
    expect((await payload.findByID({ collection: 'articole', id: pair.englishId, draft: true })).titlu).toBe('New manual EN correction')
    expect((await payload.findByID({ collection: 'articole', id: pair.englishId, draft: false })).titlu).toBe(liveBefore.titlu)
  }, 45_000)
})
