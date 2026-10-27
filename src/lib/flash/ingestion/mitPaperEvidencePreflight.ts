import {
  parse,
  type DefaultTreeAdapterMap,
} from 'parse5'

import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']

export type MitPaperEvidenceDiagnosticStatus =
  | 'supported_primary_link'
  | 'unsupported_labelled_link'
  | 'ambiguous_paper_links'
  | 'missing_paper_label'

export interface MitPaperEvidenceDiagnostic {
  status: MitPaperEvidenceDiagnosticStatus
  labelledLinkCount: number
  ambiguousPaperParagraphCount: number
  recognizedEvidenceCount: number
}

function isElement(node: Node): node is Element {
  return 'tagName' in node
}

function visibleElements(node: Node): Element[] {
  if (isElement(node) && (
    ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside', 'figure', 'figcaption'].includes(node.tagName) ||
    node.attrs.some(a => a.name === 'hidden' || (a.name === 'aria-hidden' && a.value === 'true'))
  )) {
    return []
  }

  return [
    ...(isElement(node) ? [node] : []),
    ...('childNodes' in node ? node.childNodes.flatMap(visibleElements) : []),
  ]
}

function visibleText(node: Node): string {
  if (node.nodeName === '#text') {
    return (node as DefaultTreeAdapterMap['textNode']).value
  }
  if (isElement(node) && (
    ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside', 'figure', 'figcaption'].includes(node.tagName) ||
    node.attrs.some(a => a.name === 'hidden' || (a.name === 'aria-hidden' && a.value === 'true'))
  )) {
    return ''
  }
  return 'childNodes' in node ? node.childNodes.map(visibleText).join('') : ''
}

/**
 * Diagnostic only. A labelled publisher link that is not recognized by the
 * strict research adapter remains unsupported; this helper never promotes it
 * into verified evidence or changes editorial permissions.
 */
export function diagnoseMitPaperEvidence(
  html: string,
  recognizedPrimaryEvidenceUrls: readonly string[],
): MitPaperEvidenceDiagnostic {
  const documentElements = visibleElements(parse(html))
  const main = documentElements.filter(node => node.tagName === 'main')

  if (main.length !== 1) {
    throw new Error('MIT evidence diagnostic requires exactly one main container.')
  }

  const mainElements = visibleElements(main[0]!)
  const labelled = new Set<Element>()
  let ambiguousPaperParagraphCount = 0

  for (const node of mainElements) {
    if (node.tagName !== 'p') continue

    const paragraphText = visibleText(node).replace(/\s+/g, ' ').trim()
    if (!/^paper\s*:/i.test(paragraphText)) continue

    const links = visibleElements(node).filter(item => item.tagName === 'a')
    if (links.length === 1) {
      labelled.add(links[0]!)
    } else if (links.length > 1) {
      ambiguousPaperParagraphCount += 1
    }
  }

  for (const node of mainElements) {
    if (node.tagName !== 'a') continue
    if (/^paper\s*:?$/i.test(visibleText(node).replace(/\s+/g, ' ').trim())) {
      labelled.add(node)
    }
  }

  const labelledLinkCount = labelled.size
  const recognizedEvidenceCount = recognizedPrimaryEvidenceUrls.length

  return {
    status: recognizedEvidenceCount > 0
      ? 'supported_primary_link'
      : ambiguousPaperParagraphCount > 0
        ? 'ambiguous_paper_links'
        : labelledLinkCount > 0
          ? 'unsupported_labelled_link'
          : 'missing_paper_label',
    labelledLinkCount,
    ambiguousPaperParagraphCount,
    recognizedEvidenceCount,
  }
}

/**
 * The staging handoff cannot bridge a pending identity for research sources at
 * editorialTrust=standard. Avoid AI requests that cannot produce an
 * acceptable review draft, but only when the explicit staging worker flag is
 * present. Other preview and production workflows remain unchanged.
 */
export function shouldSkipUngroundedResearchBeforeProvider({
  candidate,
  hasGroundedEventFingerprint,
  stagingWorkerPreflightEnabled,
  hasHandoffOutput,
  sourceVerificationPassed,
  strongDuplicateFound,
}: {
  candidate: FlashNormalizedArticleCandidate
  hasGroundedEventFingerprint: boolean
  stagingWorkerPreflightEnabled: boolean
  hasHandoffOutput: boolean
  sourceVerificationPassed: boolean
  strongDuplicateFound: boolean
}): boolean {
  return (
    stagingWorkerPreflightEnabled &&
    hasHandoffOutput &&
    ['mit-news', 'microsoft-research'].includes(candidate.sourceAdapter ?? '') &&
    candidate.sourceRole === 'primary' &&
    candidate.editorialTrust === 'standard' &&
    candidate.allowAutoPublish === false &&
    !hasGroundedEventFingerprint &&
    sourceVerificationPassed &&
    !strongDuplicateFound
  )
}
