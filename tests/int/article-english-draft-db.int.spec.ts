import { describe, expect, it, vi } from 'vitest'
import { createLocalReq, getPayload } from 'payload'
import config from '@/payload.config'
import { prepareEnglishDraft } from '../../src/endpoints/translateArticle'

const content = { root: { type: 'root', format: '', indent: 0, version: 1, children: [
  { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: 'CI fixture', format: 0, version: 1 }] },
] } }
const isolatedCI = process.env.CI === 'true' && process.env.DATABASE_URL?.includes('127.0.0.1:5432/ci')

describe('English article transaction against isolated PostgreSQL', () => {
  it.skipIf(!isolatedCI)('persists reciprocal drafts, prevents duplicates, rolls back partial writes and flags later edits', async () => {
    const payload = await getPayload({ config: await config })
    const user = { id: 1, collection: 'useri' as const, rol: 'admin' as const, email: 'fixture@example.invalid' } as any
    const request = () => createLocalReq({ user }, payload)
    const key = `editor-ci-${Date.now()}-${process.pid}`
    const category = await payload.create({ collection: 'categorii', data: { nume: 'Editor CI', slug: key, pilon: 'sanatate' } })
    const createRO = async (suffix: string) => payload.create({
      collection: 'articole', draft: true, req: await request(),
      data: { titlu: 'Articol test CI', slug: `${key}-${suffix}`, limba: 'ro', pilon: category.id, tip: 'analiza',
        excerpt: 'Rezumat test.', continut: content as never, editorialStatus: 'review' },
    })
    const translate = vi.fn(async () => ({ titlu: 'CI article', excerpt: 'CI summary.', continut: content, metaTitle: 'CI', metaDescription: 'CI article' }))
    const ro = await createRO('success')
    const result = await prepareEnglishDraft(await request(), ro.id, translate)
    const en = await payload.findByID({ collection: 'articole', id: result.englishId, draft: true, depth: 0 })
    const savedRO = await payload.findByID({ collection: 'articole', id: ro.id, draft: true, depth: 0 })
    expect(en).toMatchObject({ limba: 'en', _status: 'draft', editorialStatus: 'review', versiuneAlternativa: ro.id })
    expect(savedRO).toMatchObject({ versiuneAlternativa: en.id, necesitaRetraducere: false })
    expect(await prepareEnglishDraft(await request(), ro.id, translate)).toEqual({ englishId: en.id, created: false })
    expect(translate).toHaveBeenCalledTimes(1)

    await payload.update({ collection: 'articole', id: ro.id, draft: true, req: await request(), data: { titlu: 'Titlu modificat' } })
    expect((await payload.findByID({ collection: 'articole', id: ro.id, draft: true })).necesitaRetraducere).toBe(true)

    const failureRO = await createRO('rollback')
    const originalUpdate = payload.update.bind(payload)
    const update = vi.spyOn(payload, 'update').mockImplementation(async (args: any) => {
      if (args.collection === 'articole' && args.id === failureRO.id) throw new Error('Synthetic backlink failure')
      return originalUpdate(args) as any
    })
    try {
      await expect(prepareEnglishDraft(await request(), failureRO.id, translate)).rejects.toThrow('Synthetic backlink failure')
    } finally {
      update.mockRestore()
    }
    expect((await payload.find({ collection: 'articole', draft: true,
      where: { versiuneAlternativa: { equals: failureRO.id } } })).totalDocs).toBe(0)

    const concurrentRO = await createRO('concurrent')
    let release!: () => void
    const barrier = new Promise<void>(resolve => { release = resolve })
    let arrived = 0
    const concurrentTranslate = async () => {
      if (++arrived === 2) release()
      await barrier
      return translate()
    }
    const outcomes = await Promise.allSettled([
      prepareEnglishDraft(await request(), concurrentRO.id, concurrentTranslate),
      prepareEnglishDraft(await request(), concurrentRO.id, concurrentTranslate),
    ])
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
    expect((await payload.find({ collection: 'articole', draft: true,
      where: { versiuneAlternativa: { equals: concurrentRO.id } } })).totalDocs).toBe(1)
  }, 45_000)
})
