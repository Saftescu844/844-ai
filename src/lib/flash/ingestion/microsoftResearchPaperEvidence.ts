import { microsoftResearchPaperReference, extractMicrosoftResearchPublicationIdentity } from './microsoftResearchArticleAdapter'
import { retrieveFlashSource } from '../runtimeEvidence/sourceRetriever'

export type MicrosoftResearchPaperEvidenceStatus = 'missing_label' | 'ambiguous_links' | 'unsupported_link' |
  'retrieval_failed' | 'unsupported_publication' | 'missing_identifier' | 'resolved_arxiv'
export interface MicrosoftResearchPaperEvidence {
  status: MicrosoftResearchPaperEvidenceStatus
  primaryEvidenceUrls: string[]
  publicationUrl: string | null
  publicationDate: string | null
}

/** At most one same-source publication-page request, with no redirects, PDFs, search or external fetches. */
export async function resolveMicrosoftResearchPaperEvidence({ sourceUrl, articleUrl, html, retrieve = retrieveFlashSource }: {
  sourceUrl: string; articleUrl: string; html: string; retrieve?: typeof retrieveFlashSource
}): Promise<MicrosoftResearchPaperEvidence> {
  const reference = microsoftResearchPaperReference(sourceUrl, articleUrl, html)
  const unresolved = (status: MicrosoftResearchPaperEvidenceStatus): MicrosoftResearchPaperEvidence => ({
    status, primaryEvidenceUrls: [], publicationUrl: reference.url, publicationDate: null })
  if (reference.status !== 'publication_page') return unresolved(reference.status)
  const result = await retrieve({ id: 'microsoft-research-primary-paper', registeredSourceUrl: sourceUrl,
    concreteUrl: reference.url }, { timeoutMs: 15_000, maxBytes: 2_000_000, maxRedirects: 0 })
  if (result.failureReason || result.statusCode !== 200 || !result.candidate.retrieved ||
      !result.candidate.contentAvailable || !result.textContent ||
      result.bytesRead >= 2_000_000 || !/^text\/html(?:;|$)|^application\/xhtml\+xml(?:;|$)/i.test(result.contentType ?? '') ||
      result.candidate.finalUrl !== reference.url) return unresolved('retrieval_failed')
  let identity: ReturnType<typeof extractMicrosoftResearchPublicationIdentity>
  try { identity = extractMicrosoftResearchPublicationIdentity(sourceUrl, reference.url, result.textContent) }
  catch (error) {
    // Only known adapter rejections are an unresolved identity; unknown bugs still propagate.
    if (!(error instanceof Error) || !/^(?:FLASH_MICROSOFT_RESEARCH_ARTICLE_LAYOUT_UNSUPPORTED:|Microsoft Research publication |Unsupported Microsoft Research primary publication target\.)/.test(error.message)) throw error
    return unresolved('unsupported_publication')
  }
  if (!identity.primaryEvidenceUrls.length) return unresolved('missing_identifier')
  return { status: 'resolved_arxiv', primaryEvidenceUrls: identity.primaryEvidenceUrls,
    publicationUrl: reference.url, publicationDate: identity.publicationDate }
}
