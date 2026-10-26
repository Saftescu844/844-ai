/**
 * Execute the bounded sequence of eligible RSS candidates.
 *
 * A skipped candidate consumes one attempt; an unhandled exception propagates
 * so configuration, persistence and unknown errors still fail closed.
 */
export async function runFlashRssStageNextAttempts<Candidate>({
  candidates,
  maxAttempts,
  processCandidate,
}: {
  candidates: readonly Candidate[]
  maxAttempts: number
  processCandidate: (
    candidate: Candidate,
    attempt: number,
  ) => Promise<'skip' | 'complete'>
}): Promise<{
  completed: boolean
  attemptedCount: number
}> {
  const boundedCandidates = candidates.slice(
    0,
    maxAttempts,
  )

  for (const [index, candidate] of boundedCandidates.entries()) {
    const outcome = await processCandidate(candidate, index + 1)

    if (outcome === 'complete') {
      return {
        completed: true,
        attemptedCount: index + 1,
      }
    }
  }

  return {
    completed: false,
    attemptedCount: boundedCandidates.length,
  }
}

/** Only the observed pre-persistence article-fetch failure is skippable. */
export function isFlashRssArticleRetrievalHttpFailure(
  output: string,
): boolean {
  return output.includes(
    'HTML article retrieval failed: http_error',
  )
}

/** Only explicit, bounded structural failures from known source adapters are skipped. */
export function isFlashRssArticleUnsupportedLayoutFailure(output: string): boolean {
  return output.split(/\r?\n/).some(line =>
    /^FLASH_(?:OPENAI|ANTHROPIC)_ARTICLE_LAYOUT_UNSUPPORTED: (?:document|canonical URL|main container|article container|headline|publication region|original publication date|description|article body)$/.test(line))
}
