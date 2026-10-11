import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import {
  parseApprovedSandoEditorial,
  isApprovedSandoSourceRegistry,
  SANDO_APPROVED_ARTICLE_URL,
  SANDO_APPROVED_CLASSIFICATION,
  SANDO_APPROVED_EVENT_FINGERPRINT,
  SANDO_APPROVED_MANUSCRIPTS,
  SANDO_APPROVED_SOURCE_FINGERPRINT,
} from '@/lib/flash/ingestion/approvedSandoEditorial'
import {
  countFlashEditorialWords,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

const execFileAsync = promisify(execFile)
const cliPath = resolve(
  process.cwd(),
  'scripts/flash-ai-staging-import-approved-sando-pair.ts',
)

async function markdownFor(language: 'ro' | 'en'): Promise<string> {
  return readFile(
    resolve(process.cwd(), SANDO_APPROVED_MANUSCRIPTS[language].path),
    'utf8',
  )
}

describe('Editorially approved SANDO RO/EN atomic staging import', () => {
  it.each(['ro', 'en'] as const)(
    'preserves exactly the approved %s article, excerpt and word count',
    async language => {
      const markdown = await markdownFor(language)
      const expected = SANDO_APPROVED_MANUSCRIPTS[language]
      const parsed = parseApprovedSandoEditorial(language, markdown)

      expect(parsed.editorial.editorialTitle).toBe(expected.title)
      expect(parsed.editorial.language).toBe(language)
      expect(parsed.sha256).toBe(expected.sha256)
      expect(parsed.wordCount).toBe(expected.bodyWords)
      expect(parsed.excerpt.length).toBeGreaterThanOrEqual(180)
      expect(parsed.excerpt.length).toBeLessThanOrEqual(300)
      expect(parsed.editorial.editorialParagraphs).toHaveLength(language === 'ro' ? 6 : 5)
      expect(countFlashEditorialWords(parsed.editorial.editorialParagraphs)).toBe(expected.bodyWords)
      expect(parsed.editorial.editorialParagraphs.join(' ')).toContain(
        language === 'ro' ? 'Potrivit comunicatului MIT News' : 'According to MIT News',
      )
    },
  )

  it.each(['ro', 'en'] as const)(
    'refuses any unapproved %s manuscript mutation or truncation',
    async language => {
      const original = await markdownFor(language)
      const altered = original.replace('SANDO', 'SANDO-CHANGED')
      expect(() => parseApprovedSandoEditorial(language, altered))
        .toThrow('editorially approved SHA-256')
      expect(() => parseApprovedSandoEditorial(language, original.slice(0, -25)))
        .toThrow('editorially approved SHA-256')
      expect(() => parseApprovedSandoEditorial(language, original.replace(/\n/g, '\r\n')))
        .toThrow('editorially approved SHA-256')
    },
  )

  it('never swaps the RO and EN manuscripts or changes reviewed classification', async () => {
    const [ro, en] = await Promise.all([markdownFor('ro'), markdownFor('en')])
    expect(() => parseApprovedSandoEditorial('ro', en)).toThrow('SHA-256')
    expect(() => parseApprovedSandoEditorial('en', ro)).toThrow('SHA-256')
    expect(SANDO_APPROVED_CLASSIFICATION).toEqual({
      pilonId: 1,
      flashType: 'research',
      informationStatus: 'official',
      riskLevel: 'medium',
      isHealthRelated: false,
    })
    expect(SANDO_APPROVED_SOURCE_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/)
    expect(SANDO_APPROVED_EVENT_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/)
    expect(SANDO_APPROVED_ARTICLE_URL).toMatch(/^https:\/\/news\.mit\.edu\//)
  })

  it('accepts only the existing primary MIT standard-trust source for grounded SANDO review', () => {
    const source = {
      id: 6,
      activa: true,
      allowIngestion: true,
      allowAutoPublish: false,
      sourceRole: 'primary' as const,
      editorialTrust: 'standard' as const,
      pilon: [1],
    }
    expect(isApprovedSandoSourceRegistry(source)).toBe(true)
    expect(isApprovedSandoSourceRegistry({ ...source, pilon: [{ id: 1 }] })).toBe(true)
    expect(isApprovedSandoSourceRegistry(null)).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, id: 7 })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, activa: false })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, allowIngestion: false })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, allowAutoPublish: true })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, sourceRole: 'secondary' })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, editorialTrust: 'high' })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, editorialTrust: 'restricted' })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, pilon: [2] })).toBe(false)
    expect(isApprovedSandoSourceRegistry({ ...source, pilon: null })).toBe(false)
  })

  it('documents dry-run help without loading DB, making provider requests or writing', async () => {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'scripts/flash-ai-staging-import-approved-sando-pair.ts', '--help'],
      { cwd: process.cwd(), env: {
        ...process.env,
        DATABASE_URL: '',
        RAILWAY_PROJECT_ID: '',
        RAILWAY_ENVIRONMENT_ID: '',
        RAILWAY_SERVICE_ID: '',
        OPENAI_API_KEY: '',
      } },
    )
    expect(stdout).toContain('default: read-only')
    expect(stdout).toContain('no AI or publication')
    expect(stderr).toBe('')
  })

  it('uses the existing staging+database guard and atomic pair writer without bypass or AI calls', async () => {
    const script = await readFile(cliPath, 'utf8')
    expect(script).toContain('assertFlashAiStagingWriteAllowed')
    expect(script).toContain('PAYLOAD_DB_PUSH')
    expect(script).toContain('RAILWAY_PROJECT_ID')
    expect(script).toContain('RAILWAY_ENVIRONMENT_ID')
    expect(script).toContain('RAILWAY_SERVICE_ID')
    expect(script).toContain("const WRITE_FLAG = '--allow-staging-sando-pair-write'")
    expect(script).toContain('createFlashAiAtomicReviewPair({ payload, ro, en })')
    expect(script).toContain('evaluateFlashArticlePrePersistenceDedupReadOnly')
    expect(script).toContain('buildFlashAiStagingWriteInput')
    expect(script).toContain('buildVerifiedFlashEditorialLexicalContent')
    expect(script).toContain('if (!writeRequested)')
    expect(script).toContain('FLASH_SANDO_APPROVED_PAIR_DRY_RUN_OK')
    expect(script).toContain('SANDO_APPROVED_EVENT_FINGERPRINT')
    expect(script).toContain('SANDO_APPROVED_SOURCE_FINGERPRINT')
    expect(script).not.toContain('openai')
    expect(script).not.toContain('responses.create')
    expect(script).not.toContain('payload.create(')
    expect(script).not.toContain('payload.update(')
    expect(script).not.toContain('publishedAt:')
  })
})
