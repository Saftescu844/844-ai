import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  flashAlternativeLocalePublicationExcerptProblem,
} from '@/lib/flash/ingestion/flashAlternativeLocalePublicationExcerptGuard'
import {
  flashPublicationExcerptProblem,
} from '@/lib/flash/ingestion/flashPublicationExcerptGuard'

const attempt = ({
  operation = 'updateByID',
  publishAllLocales = false,
  publishSpecificLocale = null,
  proposedExcerpt = undefined,
  documentId = 34,
  readDraftExcerpt = vi.fn(async () => undefined as unknown),
}: {
  operation?: 'create' | 'update' | 'updateByID'
  publishAllLocales?: boolean
  publishSpecificLocale?: string | null
  proposedExcerpt?: unknown
  documentId?: unknown
  readDraftExcerpt?: (id: number | string) => Promise<unknown>
} = {}) => flashAlternativeLocalePublicationExcerptProblem({
  operation,
  publishAllLocales,
  publishSpecificLocale,
  proposedExcerpt,
  documentId,
  readDraftExcerpt,
})

describe('Flash AI alternate Payload publication paths', () => {
  it('leaves ordinary draft saves untouched with no document read', async () => {
    const readDraftExcerpt = vi.fn(async () => 'Old excerpt')
    expect(await attempt({ readDraftExcerpt })).toBeNull()
    expect(readDraftExcerpt).not.toHaveBeenCalled()
  })

  it('rejects publishAllLocales without a draft excerpt', async () => {
    expect(await attempt({ publishAllLocales: true })).toContain('requires')
  })

  it('rejects publishSpecificLocale without a draft excerpt', async () => {
    expect(await attempt({ publishSpecificLocale: 'en' })).toContain('requires')
  })

  it('reuses an unchanged reviewed excerpt from the latest draft', async () => {
    const readDraftExcerpt = vi.fn(async () => 'Verified excerpt')
    expect(await attempt({
      publishAllLocales: true,
      readDraftExcerpt,
    })).toBeNull()
    expect(readDraftExcerpt).toHaveBeenCalledExactlyOnceWith(34)
  })

  it('does not silently reuse the old excerpt when a blank/null is sent', async () => {
    const readDraftExcerpt = vi.fn(async () => 'Verified old excerpt')
    expect(await attempt({
      publishSpecificLocale: 'ro',
      proposedExcerpt: '',
      readDraftExcerpt,
    })).toContain('requires')
    expect(await attempt({
      publishAllLocales: true,
      proposedExcerpt: null,
      readDraftExcerpt,
    })).toContain('requires')
  })

  it('accepts an explicit valid excerpt on create or update', async () => {
    const readDraftExcerpt = vi.fn(async () => undefined)
    expect(await attempt({
      operation: 'create',
      publishAllLocales: true,
      proposedExcerpt: 'Verified content',
      readDraftExcerpt,
    })).toBeNull()
    expect(readDraftExcerpt).not.toHaveBeenCalled()
    expect(await attempt({
      publishSpecificLocale: 'en',
      proposedExcerpt: 'Verified content',
      readDraftExcerpt,
    })).toBeNull()
  })

  it('fails closed for bulk requests without a single ID', async () => {
    const readDraftExcerpt = vi.fn(async () => 'Valid existing text')
    expect(await attempt({
      operation: 'update',
      publishAllLocales: true,
      documentId: null,
      readDraftExcerpt,
    })).toContain('one document ID')
    expect(readDraftExcerpt).not.toHaveBeenCalled()
  })

  it('does not authorize publication if the draft read fails', async () => {
    await expect(attempt({
      publishAllLocales: true,
      readDraftExcerpt: async () => { throw new Error('database unavailable') },
    })).rejects.toThrow('database unavailable')
  })

  it('keeps execution of scheduled publishing guarded by _status', () => {
    const noExcerpt = flashPublicationExcerptProblem({
      requestedStatus: 'published',
      proposedExcerpt: undefined,
      priorExcerpt: null,
    })
    expect(noExcerpt).toContain('requires')
    expect(flashPublicationExcerptProblem({
      requestedStatus: 'published',
      proposedExcerpt: 'Verified excerpt at execution time',
      priorExcerpt: null,
    })).toBeNull()
  })

  it('wires the alternative guard after RBAC and preserves the scheduled status gate', async () => {
    const code = await readFile(resolve('src/collections/FlashAI.ts'), 'utf8')
    expect(code).toContain('flashAlternativeLocalePublicationExcerptProblem({')
    expect(code).toContain('draft: true')
    expect(code).toContain('overrideAccess: true')
    const rbac = code.indexOf('      enforceFlashPublicationRBAC,')
    const alternate = code.indexOf('      enforceFlashAlternativePublicationExcerpt,')
    expect(rbac).toBeGreaterThan(-1)
    expect(alternate).toBeGreaterThan(rbac)
    expect(code).toContain('requestedStatus: data._status')
    expect(code).toContain('schedulePublish: true')
  })
})
