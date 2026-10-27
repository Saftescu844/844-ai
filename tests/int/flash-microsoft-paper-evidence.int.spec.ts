// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { microsoftResearchPaperReference, extractMicrosoftResearchPublicationIdentity } from '@/lib/flash/ingestion/microsoftResearchArticleAdapter'
import { resolveMicrosoftResearchPaperEvidence } from '@/lib/flash/ingestion/microsoftResearchPaperEvidence'
import { extractFlashHtmlArticle } from '@/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import { evaluateExplicitGroundedEventIdentity } from '@/lib/flash/ingestion/explicitGroundedEventIdentity'
import { shouldSkipUngroundedResearchBeforeProvider } from '@/lib/flash/ingestion/mitPaperEvidencePreflight'
import { isFlashRssMicrosoftPaperEvidenceUnavailable } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'
import type { retrieveFlashSource } from '@/lib/flash/runtimeEvidence/sourceRetriever'

const sourceUrl = 'https://www.microsoft.com/en-us/research/'
const articleUrl = `${sourceUrl}blog/student-simulators/`
const publicationUrl = `${sourceUrl}publication/student-simulators/`
const link = `<a href="${publicationUrl}">Paper</a>`
const blog = (links = link) => `<html lang="en"><head><link rel="canonical" href="${articleUrl}"></head>
<main itemtype="https://schema.org/BlogPosting"><h1 itemprop="headline">AI student simulators</h1>
<time itemprop="datePublished" datetime="2026-10-12T09:00:00-07:00">October 12, 2026</time>
<div class="single-post__content" itemprop="articleBody"><p>Research-stage AI tutoring evaluation.</p>${links}</div></main></html>`
const pub = (links = '<a class="btn btn-primary btn-lg" href="https://arxiv.org/abs/2609.01591v1">Publication</a>') =>
  `<html lang="en-US"><head><link rel="canonical" href="${publicationUrl}">
<meta name="citation_title" content="Student simulators"><meta name="citation_publication_date" content="2026/09/01"></head>
<main class="single-publication publication-body"><h1>Student simulators</h1><p>Research abstract.</p><aside class="col-12 col-md-3 mt-5 mt-md-0">${links}</aside>
<aside><a class="btn-primary" href="https://arxiv.org/abs/2601.00001">Publication</a></aside></main></html>`
function retrieval(html = pub(), extra: Partial<Awaited<ReturnType<typeof retrieveFlashSource>>> = {}): Awaited<ReturnType<typeof retrieveFlashSource>> {
  return { candidate: { id: 'test', registeredSourceUrl: sourceUrl, concreteUrl: publicationUrl, finalUrl: publicationUrl,
    retrieved: true, contentAvailable: true }, statusCode: 200, contentType: 'text/html; charset=UTF-8', bytesRead: html.length,
    textContent: html, failureReason: null, networkPolicyReason: null, ...extra }
}
const resolve = (retrieve: typeof retrieveFlashSource, html = blog()) => resolveMicrosoftResearchPaperEvidence({ sourceUrl, articleUrl, html, retrieve })

describe('Explicit Microsoft Research primary-paper chain', () => {
  it('uses exactly one bounded same-source request and grounds the explicit arXiv link without changing the blog date', async () => {
    const retrieve = vi.fn<typeof retrieveFlashSource>().mockResolvedValue(retrieval())
    const paper = await resolve(retrieve)
    expect(retrieve).toHaveBeenCalledExactlyOnceWith({ id: 'microsoft-research-primary-paper', registeredSourceUrl: sourceUrl,
      concreteUrl: publicationUrl }, { timeoutMs: 15_000, maxBytes: 2_000_000, maxRedirects: 0 })
    expect(paper).toEqual({ status: 'resolved_arxiv', primaryEvidenceUrls: ['https://arxiv.org/abs/2609.01591'],
      publicationUrl, publicationDate: '2026-09-01' })
    const candidate = normalizeFlashHtmlArticleCandidate({ sourceId: 10, sourceName: 'Microsoft Research',
      registeredSourceUrl: sourceUrl, sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase',
      allowAutoPublish: false }, { ...extractFlashHtmlArticle(sourceUrl, articleUrl, blog()), primaryEvidenceUrls: paper.primaryEvidenceUrls })
    expect(candidate.sourcePublicationDate).toBe('2026-10-12')
    expect(candidate.editorialTrust).toBe('standard')
    expect(evaluateExplicitGroundedEventIdentity(candidate)).toMatchObject({ status: 'grounded',
      identity: { authority: 'arxiv', stableId: '2609.01591' } })
  })
  it.each([
    ['', 'missing_label'],
    [`<a href="${publicationUrl}">StudentSim</a>`, 'missing_label'],
    [`<nav>${link}</nav><div class="msr-promo">${link}</div><p hidden>${link}</p>`, 'missing_label'],
    [link + link.replace('/publication/student-simulators/', '/publication/other-study/'), 'ambiguous_links'],
    [link.replace('www.microsoft.com', 'microsoft.com.evil.test'), 'unsupported_link'],
    [link.replace('https://', 'http://'), 'unsupported_link'],
    [link.replace('/en-us/research/', '/fr-fr/research/'), 'unsupported_link'],
    [link.replace('/publication/', '/publications/'), 'unsupported_link'],
    [link.replace('https://www.microsoft.com', 'https://user@www.microsoft.com:444'), 'unsupported_link'],
  ])('does not request missing, unrelated, ambiguous or unsupported targets', async (links, status) => {
    const retrieve = vi.fn<typeof retrieveFlashSource>()
    expect(await resolve(retrieve, blog(links))).toMatchObject({ status, primaryEvidenceUrls: [] })
    expect(retrieve).not.toHaveBeenCalled()
  })
  it('accepts the observed Technical report label and deduplicates identical primary links', () => {
    expect(microsoftResearchPaperReference(sourceUrl, articleUrl, blog(link.replace('Paper', 'Technical report') + link)))
      .toEqual({ status: 'publication_page', url: publicationUrl })
  })
  it.each([
    pub().replace('lang="en-US"', 'lang="fr"'), pub().replace('href="'+publicationUrl+'"', 'href="'+sourceUrl+'publication/other/"'),
    pub().replace('content="Student simulators"', 'content="Other study"'), pub().replace('class="single-publication publication-body"', 'class="other"'),
    pub().replace('</main>', '<h1>Another title</h1></main>'),
    pub('<a class="btn-primary" href="https://arxiv.org/abs/2609.01591">Publication</a><a class="btn-primary" href="https://arxiv.org/abs/2609.01592">Publication</a>'),
    pub('<a class="btn-primary" href="https://arxiv.org.evil.test/abs/2609.01591">Publication</a>'),
    pub('<a class="btn-primary" href="http://arxiv.org/abs/2609.01591">Publication</a>'),
    pub('<a class="btn-primary" href="https://user@arxiv.org/abs/2609.01591">Publication</a>'),
    pub('<a class="btn-primary" href="https://arxiv.org/pdf/2609.01591">Publication</a>'),
    pub('<a class="btn-primary" href="http://[invalid">Publication</a>'),
  ])('leaves conflicting publication provenance unresolved', async html => {
    expect(await resolve(vi.fn<typeof retrieveFlashSource>().mockResolvedValue(retrieval(html))))
      .toMatchObject({ status: 'unsupported_publication', primaryEvidenceUrls: [] })
  })
  it('never treats a PDF, abstract identifier, navigation link or citation title as an explicit primary identity', async () => {
    const html = pub('<p>Previous work: arXiv:2601.00001.</p><a class="btn-primary" href="https://www.microsoft.com/paper.pdf">PDF</a>')
    expect(await resolve(vi.fn<typeof retrieveFlashSource>().mockResolvedValue(retrieval(html))))
      .toMatchObject({ status: 'missing_identifier', primaryEvidenceUrls: [] })
  })
  it.each([
    { failureReason: 'http_error' as const, statusCode: 403 }, { failureReason: 'timeout' as const },
    { failureReason: 'redirect_limit_exceeded' as const }, { bytesRead: 2_000_000 },
    { contentType: 'application/pdf' }, { contentType: null }, { statusCode: 206 },
    { candidate: { ...retrieval().candidate, contentAvailable: false } },
    { candidate: { ...retrieval().candidate, finalUrl: `${sourceUrl}publication/different/` } },
  ])('does not resolve failed, truncated, redirected or non-HTML retrievals', async extra => {
    expect(await resolve(vi.fn<typeof retrieveFlashSource>().mockResolvedValue(retrieval(pub(), extra))))
      .toMatchObject({ status: 'retrieval_failed', primaryEvidenceUrls: [] })
  })
  it('does not guess an invalid or absent paper date and still keeps an explicit identity distinct from freshness', () => {
    expect(extractMicrosoftResearchPublicationIdentity(sourceUrl, publicationUrl, pub().replace('2026/09/01', '2026/02/31')))
      .toMatchObject({ primaryEvidenceUrls: ['https://arxiv.org/abs/2609.01591'], publicationDate: null })
  })
  it('propagates unknown retrieval errors rather than claiming a source rejection', async () => {
    await expect(resolve(vi.fn<typeof retrieveFlashSource>().mockRejectedValue(new Error('unexpected bug')))).rejects.toThrow('unexpected bug')
  })
  it('skips ungrounded standard-trust Microsoft candidates before providers only within existing staging opt-in', () => {
    const candidate = normalizeFlashHtmlArticleCandidate({ sourceId: 10, sourceName: 'Microsoft Research',
      registeredSourceUrl: sourceUrl, sourceRole: 'primary', editorialTrust: 'standard', citationMode: 'paraphrase',
      allowAutoPublish: false }, extractFlashHtmlArticle(sourceUrl, articleUrl, blog('')))
    const args = { candidate, hasGroundedEventFingerprint: false, stagingWorkerPreflightEnabled: true,
      hasHandoffOutput: true, sourceVerificationPassed: true, strongDuplicateFound: false }
    expect(shouldSkipUngroundedResearchBeforeProvider(args)).toBe(true)
    expect(shouldSkipUngroundedResearchBeforeProvider({ ...args, stagingWorkerPreflightEnabled: false })).toBe(false)
    expect(shouldSkipUngroundedResearchBeforeProvider({ ...args, hasGroundedEventFingerprint: true })).toBe(false)
    expect(shouldSkipUngroundedResearchBeforeProvider({ ...args, strongDuplicateFound: true })).toBe(false)
  })
  it('classifies only exact unavailable markers as transient, never as remembered missing identities', () => {
    expect(isFlashRssMicrosoftPaperEvidenceUnavailable('FLASH_MICROSOFT_RESEARCH_PAPER_EVIDENCE_UNAVAILABLE:retrieval_failed')).toBe(true)
    expect(isFlashRssMicrosoftPaperEvidenceUnavailable('FLASH_MICROSOFT_RESEARCH_PAPER_EVIDENCE_UNAVAILABLE:unsupported_publication')).toBe(true)
    expect(isFlashRssMicrosoftPaperEvidenceUnavailable('FLASH_MICROSOFT_RESEARCH_PAPER_EVIDENCE_UNAVAILABLE:unknown')).toBe(false)
    expect(isFlashRssMicrosoftPaperEvidenceUnavailable('prefix FLASH_MICROSOFT_RESEARCH_PAPER_EVIDENCE_UNAVAILABLE:retrieval_failed')).toBe(false)
  })
})
