import { describe, expect, it, vi } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { recoverLegacyTranslation } from '../../scripts/legacy-translation-recovery-core'

const lexical = (text: string) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1,
    children: [{
      type: 'paragraph', format: '', indent: 0, version: 1,
      children: [{ type: 'text', text, format: 0, version: 1 }],
    }],
  },
})

describe('PR-262 recovery: isolated PostgreSQL + real Payload integration', () => {
  it('persists only one EN review draft, links both sides, and forbids repeat recovery', async () => {
    // GitHub CI provisions a disposable postgres:17 database and fake service credentials.
    if (process.env.CI !== 'true' || !process.env.DATABASE_URL?.includes('127.0.0.1:5432/ci')) {
      console.log('Skip database-backed recovery rehearsal outside isolated CI')
      return
    }
    const payload = await getPayload({ config: await config })
    const key = `pr262-ci-${Date.now()}-${process.pid}`
    const category = await payload.create({
      collection: 'categorii', overrideAccess: true,
      data: { nume: 'PR262 CI Isolated Recovery', slug: key, pilon: 'sanatate' },
    })
    const ro = await payload.create({
      collection: 'articole', draft: true, overrideAccess: true,
      data: {
        titlu: 'PR262 test RO — laborator virtual', slug: `${key}-ro`,
        limba: 'ro', pilon: category.id, tip: 'stire-auto',
        excerpt: 'Text fictiv, doar pentru testarea recuperării.',
        continut: lexical('Conținut fictiv în română.') as never,
        sursaNume: 'PR262 CI fixture', sursaLink: `https://example.invalid/${key}`,
        subcategorie: 'diagnostic', generatAutomat: true,
        editorialStatus: 'review', numarConfirmari: 1,
      },
    })
    const translate = vi.fn(async () => ({
      titlu: 'PR262 virtual laboratory test', excerpt: 'Fake CI-only English excerpt.',
      continut: lexical('Synthetic English draft content.'),
      metaTitle: 'PR262 virtual laboratory', metaDescription: 'CI-only test article',
    }))
    const deps = { payload, translate, slugEnglish: () => `${key}-en` }
    const dryRun = await recoverLegacyTranslation(deps, ro.id, false)
    expect(dryRun).toEqual({
      kind: 'dry-run', articleId: ro.id, existingEnglishId: null,
    })
    expect(translate).not.toHaveBeenCalled()

    const result = await recoverLegacyTranslation(deps, ro.id, true)
    expect(result.kind).toBe('created')
    if (result.kind !== 'created') throw new Error('Unexpected recovery outcome')
    expect(translate).toHaveBeenCalledTimes(1)

    const savedRo = await payload.findByID({
      collection: 'articole', id: ro.id, draft: true, depth: 0,
    })
    const savedEn = await payload.findByID({
      collection: 'articole', id: result.englishId, draft: true, depth: 0,
    })
    expect(savedRo.versiuneAlternativa).toBe(result.englishId)
    expect(savedEn.versiuneAlternativa).toBe(ro.id)
    expect(savedRo._status).toBe('draft')
    expect(savedEn._status).toBe('draft')
    expect(savedEn.editorialStatus).toBe('review')
    expect(savedEn.limba).toBe('en')
    expect(savedEn.subcategorie).toBe('diagnostic')
    expect(savedEn.sursaLink).toBe(`https://example.invalid/${key}`)
    expect(savedRo.titlu).toBe('PR262 test RO — laborator virtual')

    await expect(recoverLegacyTranslation(deps, ro.id, true))
      .rejects.toThrow('already has a linked partner')
    const pairs = await payload.find({
      collection: 'articole', draft: true, depth: 0, limit: 10,
      where: { versiuneAlternativa: { equals: ro.id } },
    })
    expect(pairs.totalDocs).toBe(1)
    expect(translate).toHaveBeenCalledTimes(1)
  }, 45_000)
})
