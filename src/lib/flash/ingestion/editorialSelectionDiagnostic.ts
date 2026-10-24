import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { evaluateEditorialSelection, type EditorialSelectionResult,
  type EditorialSelectionReason } from './editorialSelection'
import type { FlashNormalizedArticleCandidate } from './articleCandidateNormalization'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
function isElement(node: Node): node is Element { return 'tagName' in node }
function hasClass(node: Element, name: string): boolean {
  return (node.attrs.find(a => a.name === 'class')?.value ?? '').split(/\s+/).includes(name)
}
function visible(node: Node): Element[] {
  if (isElement(node) && (['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside', 'figure', 'figcaption'].includes(node.tagName) ||
    node.attrs.some(a => a.name === 'hidden' || (a.name === 'aria-hidden' && a.value === 'true')) ||
    ['news-article--related-archive', 'news-article--recent-news--teaser'].some(c => hasClass(node, c)))) return []
  return [...(isElement(node) ? [node] : []), ...('childNodes' in node ? node.childNodes.flatMap(visible) : [])]
}
function text(node: Node): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value
  if (isElement(node) && !visible(node).length) return ''
  return 'childNodes' in node ? node.childNodes.map(text).join('') : ''
}

/** Source-format observation only. A Paper link alone cannot classify the article or verify claims. */
export function diagnoseRuntimeEditorialSelection({ html, candidate, sourceVerified, identityStatus, assessedAt }: {
  html: string; candidate: FlashNormalizedArticleCandidate; sourceVerified: boolean
  identityStatus: 'grounded' | 'pending' | 'ambiguous'; assessedAt: string
}): EditorialSelectionResult {
  const mains = visible(parse(html)).filter(n => n.tagName === 'main')
  const observations: Parameters<typeof evaluateEditorialSelection>[0]['formatEvidence'][number][] = []
  if (sourceVerified && candidate.sourceAdapter === 'mit-news' && mains.length === 1) {
    const containers = visible(mains[0]!).filter(n => hasClass(n, 'news-article--topics'))
    if (containers.length === 1) {
      const interview = visible(containers[0]!).some(node => {
        if (node.tagName !== 'a' || text(node).trim() !== 'Interview') return false
        try {
          const page = new URL(candidate.finalUrl)
          const url = new URL(node.attrs.find(a => a.name === 'href')?.value ?? '', page)
          return page.origin === 'https://news.mit.edu' && url.origin === page.origin &&
            !url.username && !url.password && url.pathname === '/topic/interview' && !url.search && !url.hash
        } catch { return false }
      })
      if (interview) observations.push({ format: 'interview', origin: 'explicit_source_metadata',
        basis: 'MIT main article topic: Interview.' })
    }
  }
  return evaluateEditorialSelection({ formatEvidence: observations,
    // No automatic inference that an interview lacks scientific claims.
    claimScope: 'unclear', primaryEvidence: 'missing_or_unverified',
    sourceDocumentVerified: sourceVerified, relevance: 'unclear', timeliness: 'unclear',
    publishedAt: candidate.sourcePublicationDate, assessedAt, identityStatus })
}

export interface EditorialDiagnosticMetadata {
  format: EditorialSelectionResult['sourceFormat']
  disposition: EditorialSelectionResult['editorialDisposition']
  identity: EditorialSelectionResult['identityStatus']
  reasons: EditorialSelectionReason[]
  dateKnown: boolean
}
const formats = ['research_result', 'institutional_announcement', 'interview', 'profile', 'background', 'unknown']
const dispositions = ['candidate_for_evaluation', 'needs_primary_evidence', 'context_only', 'review_required']
const identities = ['grounded', 'pending', 'ambiguous']
const reasons = ['format_unresolved', 'claims_unresolved', 'needs_primary_evidence', 'relevance_not_established',
  'context_only', 'timeliness_unresolved', 'source_document_unverified', 'date_unresolved',
  'editorial_review_required', 'identity_unresolved', 'writer_gates_not_evaluated']

export function serializeEditorialDiagnostic(result: EditorialSelectionResult): string {
  return `FLASH_EDITORIAL_SELECTION_DIAGNOSTIC v=1 format=${result.sourceFormat} disposition=${result.editorialDisposition} identity=${result.identityStatus} reasons=${result.reasonCodes.join(',')} dateKnown=${result.ageDays !== null} generationAllowed=false`
}

/** Strict bounded child-output boundary: never forward arbitrary HTML, URLs or provider text. */
export function parseEditorialDiagnostic(line: string): EditorialDiagnosticMetadata | null {
  if (line.length > 800) return null
  const match = /^FLASH_EDITORIAL_SELECTION_DIAGNOSTIC v=1 format=([a-z_]+) disposition=([a-z_]+) identity=([a-z_]+) reasons=([a-z_,]+) dateKnown=(true|false) generationAllowed=false$/.exec(line)
  if (!match || !formats.includes(match[1]!) || !dispositions.includes(match[2]!) || !identities.includes(match[3]!)) return null
  const codes = match[4]!.split(',')
  if (codes.length > reasons.length || new Set(codes).size !== codes.length || codes.some(code => !reasons.includes(code))) return null
  if (!codes.includes('writer_gates_not_evaluated')) return null
  return { format: match[1] as EditorialDiagnosticMetadata['format'],
    disposition: match[2] as EditorialDiagnosticMetadata['disposition'],
    identity: match[3] as EditorialDiagnosticMetadata['identity'],
    reasons: codes as EditorialSelectionReason[], dateKnown: match[5] === 'true' }
}

/** Instrumentation must not alter the child exit/skip/success decision. At most one report per handoff. */
export function observeEditorialDiagnostic(stdout: string | null | undefined,
  observe: (metadata: EditorialDiagnosticMetadata) => void): void {
  try {
    const lines = (stdout ?? '').split(/\r?\n/)
    const reports = lines.map(parseEditorialDiagnostic).filter((value): value is EditorialDiagnosticMetadata => value !== null)
    if (reports.length === 1) observe(reports[0]!)
  } catch { /* Diagnostics are best-effort; existing generation gates remain authoritative. */ }
}
