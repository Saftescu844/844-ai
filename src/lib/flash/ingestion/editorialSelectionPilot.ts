import type { EditorialSelectionInput } from './editorialSelection'

/** Human-reviewed audit fixtures from the 19:00 staging run; never live registry data. */
export const EDITORIAL_SELECTION_PILOT: ReadonlyArray<{
  key: string; url: string; input: EditorialSelectionInput
}> = [
  { key: 'mit-academia-interview',
    url: 'https://news.mit.edu/2026/3-questions-best-path-forward-for-ai-academia-1008',
    input: { formatEvidence: [{ format: 'interview', origin: 'human_review',
      basis: 'MIT Interview topic and the visible Q&A with Sasha Rakhlin.' }],
    // The interview includes concrete research-result claims; opinions do not waive verification.
    claimScope: 'scientific_results', primaryEvidence: 'missing_or_unverified',
    sourceDocumentVerified: true, relevance: 'established', timeliness: 'unclear',
    publishedAt: '2026-10-08', assessedAt: '2026-10-24T16:03:00Z', identityStatus: 'pending' } },
  { key: 'mit-delimitrou-profile',
    url: 'https://news.mit.edu/2026/mitigating-environmental-threat-of-data-centers-christina-delimitrou-1008',
    input: { formatEvidence: [{ format: 'profile', origin: 'human_review',
      basis: 'Career profile of Christina Delimitrou, with biographical sections.' }],
    // Assessed as background only, not as a proposed report of quantified research results.
    claimScope: 'non_scientific', primaryEvidence: 'missing_or_unverified',
    sourceDocumentVerified: true, relevance: 'established', timeliness: 'context',
    publishedAt: '2026-10-08', assessedAt: '2026-10-24T16:03:00Z', identityStatus: 'pending' } },
  { key: 'mit-concourse-background',
    url: 'https://news.mit.edu/2026/discovering-value-humanistic-inquiry-1007',
    input: { formatEvidence: [{ format: 'background', origin: 'human_review',
      basis: 'Overview of Concourse, its curriculum, community and leadership.' }],
    claimScope: 'non_scientific', primaryEvidence: 'missing_or_unverified',
    sourceDocumentVerified: true, relevance: 'established', timeliness: 'context',
    publishedAt: '2026-10-07', assessedAt: '2026-10-24T16:03:00Z', identityStatus: 'pending' } },
]
