import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  parseFlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

const base = {
  pilonId: 2,
  flashType: 'research',
  informationStatus: 'confirmed',
  riskLevel: 'medium',
  isHealthRelated: true,
}

async function source(file: string) {
  return readFile(path.resolve(process.cwd(), file), 'utf8')
}

describe('Flash AI editorial submenu classification', () => {
  it('accepts real medical and education subjects independently from flashType', () => {
    expect(parseFlashPrePersistenceClassificationSemanticOutput(
      JSON.stringify({ ...base, subcategorie: 'asistenta-clinica', subcategorieEducatie: null }),
    )).toMatchObject({ subcategorie: 'asistenta-clinica', flashType: 'research' })

    expect(parseFlashPrePersistenceClassificationSemanticOutput(
      JSON.stringify({ ...base, pilonId: 3, subcategorie: null, subcategorieEducatie: 'instrumente-edu' }),
    )).toMatchObject({ subcategorieEducatie: 'instrumente-edu' })
  })

  it('rejects unknown subcategories, extra metadata and simultaneous categories', () => {
    for (const overrides of [
      { subcategorie: 'cercetare' },
      { subcategorieEducatie: 'other' },
      { subcategorie: 'diagnostic', subcategorieEducatie: 'cercetare' },
      { subcategorie: ['diagnostic'] },
    ]) {
      expect(() => parseFlashPrePersistenceClassificationSemanticOutput(
        JSON.stringify({ ...base, ...overrides }),
      )).toThrow('invalid_output')
    }
  })

  it('includes published Flash AI with conventional articles in both medical and education submenus', async () => {
    const queries = await source('src/lib/payload.ts')
    const page = await source('src/app/(frontend)/[lang]/pilon/[pilon]/page.tsx')

    expect(queries).toContain('export async function getFlashAiSanatate')
    expect(queries).toContain("{ subcategorie: { equals: subcategorie } }")
    expect(queries).toContain('export async function getFlashAiEducatie')
    expect(queries).toContain("{ subcategorieEducatie: { equals: subcategorie } }")
    expect(queries).not.toContain("{ flashType: { equals: 'research' } }")
    expect(page).toContain('getFlashAiSanatate(lang, sub)')
    expect(page).toContain('getFlashAiEducatie(lang, sub)')
    expect(page).not.toContain("sub !== 'invatare-ai'")
    expect(page).toContain("kind === 'flash'")
  })

  it('saves category into generated draft but never infers it from flashType', async () => {
    const projection = await source('src/lib/flash/ingestion/articleCandidateFlashAiDraftProjection.ts')
    const pair = await source('src/lib/flash/ingestion/payloadFlashAiAtomicReviewPairWriter.ts')
    expect(projection).toContain('classification.subcategorie')
    expect(projection).toContain('classification.subcategorieEducatie')
    expect(pair).toContain('identical editorial subcategories for RO and EN')
  })

  it('adds optional CMS selectors and a reversible, version-aware migration', async () => {
    const schema = await source('src/collections/FlashAI.ts')
    const migration = await source('src/migrations/20261009_200000_flash_editorial_subcategories.ts')
    expect(schema).toContain("name: 'subcategorie'")
    expect(schema).toContain("name: 'subcategorieEducatie'")
    expect(migration).toContain('ALTER TABLE "_flash_ai_v"')
    expect(migration).toContain('export async function down')
  })
})
