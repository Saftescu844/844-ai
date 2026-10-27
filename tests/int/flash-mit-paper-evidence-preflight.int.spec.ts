import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  extractFlashHtmlArticle,
} from '@/lib/flash/ingestion/htmlArticleExtraction'
import {
  normalizeFlashHtmlArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import {
  evaluateExplicitGroundedEventIdentity,
} from '@/lib/flash/ingestion/explicitGroundedEventIdentity'
import {
  diagnoseMitPaperEvidence,
  shouldSkipUngroundedResearchBeforeProvider,
} from '@/lib/flash/ingestion/mitPaperEvidencePreflight'

const registeredUrl = 'https://news.mit.edu/'
const articleUrl = 'https://news.mit.edu/2026/test-study-1013'

function html(paperParagraph: string): string {
  return `<!doctype html><html lang="en"><head>
    <meta name="description" content="A synthetic research story."></head>
    <body><main><article><h1>Synthetic AI research story</h1>
    <time>October 13, 2026</time>
    <div class="news-article--content--body--inner">
      <p>The authors report a new method.</p><p>Evaluation is ongoing.</p>
    </div>
    ${paperParagraph}
    </article></main></body></html>`
}

function extract(htmlText: string, editorialTrust: 'standard' | 'high' = 'standard') {
  const article = extractFlashHtmlArticle(registeredUrl, articleUrl, htmlText)
  const candidate = normalizeFlashHtmlArticleCandidate({
    sourceId: 6,
    sourceName: 'MIT News',
    registeredSourceUrl: registeredUrl,
    sourceRole: 'primary',
    editorialTrust,
    citationMode: 'paraphrase',
    allowAutoPublish: false,
  }, article)
  const identity = evaluateExplicitGroundedEventIdentity(candidate)

  const skip = (overrides: Partial<Parameters<typeof shouldSkipUngroundedResearchBeforeProvider>[0]> = {}) =>
    shouldSkipUngroundedResearchBeforeProvider({
      candidate,
      hasGroundedEventFingerprint: identity.status === 'grounded',
      stagingWorkerPreflightEnabled: true,
      hasHandoffOutput: true,
      sourceVerificationPassed: true,
      strongDuplicateFound: false,
      ...overrides,
    })

  return { article, candidate, identity, skip }
}

describe('MIT primary-evidence staging preflight diagnostics', () => {
  it('identifies an explicit Paper link to an unsupported journal host without promoting it into evidence', () => {
    const page = html('<p>Paper: <a href="https://www.pnas.org/doi/10.1073/pnas.2601234567">Journal study</a></p>')
    const { article, identity, skip } = extract(page)
    expect(article.primaryEvidenceUrls).toEqual([])
    expect(identity).toMatchObject({
      status: 'pending',
      reason: 'no_explicit_identifier',
    })
    expect(diagnoseMitPaperEvidence(page, article.primaryEvidenceUrls ?? [])).toEqual({
      status: 'unsupported_labelled_link',
      labelledLinkCount: 1,
      ambiguousPaperParagraphCount: 0,
      recognizedEvidenceCount: 0,
    })
    expect(skip()).toBe(true)
  })

  it('distinguishes a news article with no explicitly labelled primary paper', () => {
    const page = html('<p>An institutional update without a linked primary paper.</p>')
    const { article, skip } = extract(page)
    expect(diagnoseMitPaperEvidence(page, article.primaryEvidenceUrls ?? [])).toEqual({
      status: 'missing_paper_label',
      labelledLinkCount: 0,
      ambiguousPaperParagraphCount: 0,
      recognizedEvidenceCount: 0,
    })
    expect(skip()).toBe(true)
  })

  it('recognizes supported MIT DOI evidence and does not skip a grounded event', () => {
    const page = html('<p>Paper: <a href="https://doi.org/10.1109/TRO.2026.3738474">Journal study</a></p>')
    const { article, identity, skip } = extract(page)
    expect(article.primaryEvidenceUrls).toEqual(['https://doi.org/10.1109/tro.2026.3738474'])
    expect(identity.status).toBe('grounded')
    expect(diagnoseMitPaperEvidence(page, article.primaryEvidenceUrls ?? [])).toEqual({
      status: 'supported_primary_link',
      labelledLinkCount: 1,
      ambiguousPaperParagraphCount: 0,
      recognizedEvidenceCount: 1,
    })
    expect(skip()).toBe(false)
  })

  it('reports ambiguous MIT Paper paragraphs with two links without treating them as evidence', () => {
    const page = html(
      '<p>Paper: <a href="https://www.pnas.org/doi/10.1073/pnas.2601234567">One</a> ' +
      'and <a href="https://www.nature.com/articles/test-study">Two</a></p>',
    )
    const { article, identity, skip } = extract(page)
    expect(article.primaryEvidenceUrls).toEqual([])
    expect(identity.status).toBe('pending')
    expect(diagnoseMitPaperEvidence(page, article.primaryEvidenceUrls ?? [])).toEqual({
      status: 'ambiguous_paper_links',
      labelledLinkCount: 0,
      ambiguousPaperParagraphCount: 1,
      recognizedEvidenceCount: 0,
    })
    expect(skip()).toBe(true)
  })

  it('does not count an unrelated unlabelled publisher citation as a primary Paper link', () => {
    const page = html(
      '<p>Previous work: <a href="https://doi.org/10.1109/TRO.2026.3738474">Background</a></p>',
    )
    const { article } = extract(page)
    expect(article.primaryEvidenceUrls).toEqual([])
    expect(diagnoseMitPaperEvidence(page, [])).toMatchObject({
      status: 'missing_paper_label',
      labelledLinkCount: 0,
      ambiguousPaperParagraphCount: 0,
    })
  })

  it('never relaxes MIT standard trust or the unsupported publisher rule', () => {
    const page = html('<p>Paper: <a href="https://www.pnas.org/doi/10.1073/pnas.2601234567">Journal study</a></p>')
    const { candidate, skip } = extract(page)
    expect(candidate.editorialTrust).toBe('standard')
    expect(candidate.allowAutoPublish).toBe(false)
    expect(candidate.primaryEvidenceUrls).toEqual([])

    expect(skip({ stagingWorkerPreflightEnabled: false })).toBe(false)
    expect(skip({ hasHandoffOutput: false })).toBe(false)
    expect(skip({ sourceVerificationPassed: false })).toBe(false)
    expect(skip({ strongDuplicateFound: true })).toBe(false)
    expect(skip({ candidate: { ...candidate, editorialTrust: 'high' } })).toBe(false)
    expect(skip({ candidate: { ...candidate, allowAutoPublish: true } })).toBe(false)
    expect(skip({ candidate: { ...candidate, sourceRole: 'secondary' } })).toBe(false)
    expect(skip({ candidate: { ...candidate, sourceAdapter: 'google-research' } })).toBe(false)
  })

  it('connects the bounded staging worker flag to the pre-provider guard and diagnostic log', async () => {
    const worker = await readFile(path.resolve(process.cwd(), 'scripts/flash-rss-stage-next.ts'), 'utf8')
    const child = await readFile(path.resolve(process.cwd(), 'scripts/flash-html-article-prepersistence-dedup-preview.ts'), 'utf8')

    expect(worker).toContain("'--staging-mit-evidence-preflight'")
    expect(worker).toContain('FLASH_MIT_PRIMARY_EVIDENCE_DIAGNOSTIC')
    expect(child).toContain('shouldSkipUngroundedResearchBeforeProvider')
    expect(child).toContain('diagnoseMitPaperEvidence')
    expect(child).toContain('providerCalled=false')
    expect(child).toContain('!allowProductionOneShot')
    expect(child).toContain('!readOnlyPilot')
    expect(child.indexOf('    shouldSkipUngroundedResearchBeforeProvider({')).toBeGreaterThan(0)
    expect(child.indexOf('    shouldSkipUngroundedResearchBeforeProvider({')).toBeLessThan(child.indexOf('if (allowProviderRequests)'))
  })
})
