// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { retrieveFlashSource } from '@/lib/flash/runtimeEvidence/sourceRetriever'
import { isFlashRssArticleRedirectIdentityMismatch, runFlashRssStageNextAttempts } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'
import { activeFlashRssCandidateSkipUrls, FLASH_RSS_REDIRECT_COOLDOWN_MS, rememberFlashRssCandidateSkip } from '@/lib/flash/ingestion/rssCandidateSkipMemory'
import { diagnoseRssHandoffFailure } from '@/lib/flash/ingestion/rssHandoffFailureDiagnostic'

const origin = 'https://digital-strategy.ec.europa.eu/'
const first = `${origin}en/news/redirected-item`
const second = `${origin}en/news/eligible-item`
const destination = 'https://smart-networks.europa.eu/other-item/'
const message = 'HTML article retrieval failed: redirect_identity_mismatch.'
const now = Date.parse('2026-11-03T10:00:00Z')
const publicResolver = async () => [{ address: '93.184.216.34', family: 4 as const }]

describe('RSS source redirect rejection and candidate replacement', () => {
  it('never fetches the redirected host, remembers the rejected URL and advances to the next candidate', async () => {
    const calls: string[] = []
    const provider = vi.fn()
    const fetchImpl: typeof fetch = async input => {
      const url = String(input)
      calls.push(url)
      return url === first
        ? new Response(null, { status: 302, headers: { location: destination } })
        : new Response('<html><p>Verified second candidate content.</p></html>', { status: 200, headers: { 'content-type': 'text/html' } })
    }
    let memory: unknown = []
    const result = await runFlashRssStageNextAttempts({ candidates: [first, second], maxAttempts: 3,
      processCandidate: async url => {
        const retrieved = await retrieveFlashSource({ id: url, registeredSourceUrl: origin, concreteUrl: url },
          { fetchImpl, networkPolicyOptions: { resolveHostname: publicResolver } })
        if (retrieved.failureReason) {
          const output = `HTML article retrieval failed: ${retrieved.failureReason}.`
          if (!isFlashRssArticleRedirectIdentityMismatch(output)) throw new Error(output)
          memory = rememberFlashRssCandidateSkip({ value: memory, url,
            reason: 'article_redirect_identity_mismatch', skippedAt: new Date(now).toISOString() })
          expect(retrieved.candidate.retrieved).toBe(false)
          expect(retrieved.textContent).toBeNull()
          return 'skip'
        }
        provider(url)
        return 'complete'
      },
    })
    expect(result).toEqual({ completed: true, attemptedCount: 2 })
    expect(calls).toEqual([first, second])
    expect(calls).not.toContain(destination)
    expect(provider).toHaveBeenCalledExactlyOnceWith(second)
    expect(activeFlashRssCandidateSkipUrls(JSON.parse(JSON.stringify(memory)), now + 60_000)).toEqual(new Set([first]))
  })

  it.each([0, 1, FLASH_RSS_REDIRECT_COOLDOWN_MS - 1])('suppresses the rejected URL during the 24h cooldown (age=%i)', age => {
    const memory = rememberFlashRssCandidateSkip({ value: [], url: first, reason: 'article_redirect_identity_mismatch', skippedAt: new Date(now).toISOString() })
    expect(activeFlashRssCandidateSkipUrls(JSON.parse(JSON.stringify(memory)), now + age).has(first)).toBe(true)
  })

  it.each([FLASH_RSS_REDIRECT_COOLDOWN_MS, FLASH_RSS_REDIRECT_COOLDOWN_MS + 1])('releases the candidate after expiry (age=%i)', age => {
    const memory = rememberFlashRssCandidateSkip({ value: [], url: first, reason: 'article_redirect_identity_mismatch', skippedAt: new Date(now).toISOString() })
    expect(activeFlashRssCandidateSkipUrls(memory, now + age).has(first)).toBe(false)
  })

  it('rejects future-dated redirect entries instead of extending the pause indefinitely', () => {
    const memory = [{ url: first, reason: 'article_redirect_identity_mismatch', skippedAt: new Date(now + 1).toISOString() }]
    expect(activeFlashRssCandidateSkipUrls(memory, now).size).toBe(0)
  })

  it('frees an attempt on later scans and restores normal selection at expiry without deleting other memory', async () => {
    const memory = rememberFlashRssCandidateSkip({ value: [{ url: `${origin}en/news/duplicate`, reason: 'strong_duplicate', skippedAt: new Date(now).toISOString() }],
      url: `${first}?tracking=1#section`, reason: 'article_redirect_identity_mismatch', skippedAt: new Date(now).toISOString() })
    const candidates = [first, second, `${origin}en/news/duplicate`]
    for (const [age, expected] of [[60_000, [second]], [FLASH_RSS_REDIRECT_COOLDOWN_MS, [first, second]]] as const) {
      const skipped = activeFlashRssCandidateSkipUrls(memory, now + age)
      const visited: string[] = []
      await runFlashRssStageNextAttempts({ candidates: candidates.filter(url => !skipped.has(url)), maxAttempts: 3,
        processCandidate: async url => { visited.push(url); return 'skip' } })
      expect(visited).toEqual(expected)
    }
  })

  it.each([
    'prefix ' + message,
    message + ' arbitrary suffix',
    message.replace('mismatch.', 'mismatch.secret'),
    'HTML article retrieval failed: network_policy_blocked.',
    'HTML article retrieval failed: source_identity_mismatch.',
    'HTML article retrieval failed: redirect_limit_exceeded.',
    'HTML article retrieval failed: network_error.',
    'Unexpected database failure',
  ])('does not classify other failures or partial markers as this skippable case: %s', output => {
    expect(isFlashRssArticleRedirectIdentityMismatch(output)).toBe(false)
    expect(diagnoseRssHandoffFailure(output)).toEqual({ phase: 'unknown', reason: 'unclassified' })
  })

  it('records only fixed diagnostic categories and never relays the redirect destination or arbitrary stderr', () => {
    const output = `FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_FAILED\n${message}\nprivate-credential ${destination}`
    expect(isFlashRssArticleRedirectIdentityMismatch(output)).toBe(true)
    const diagnostic = diagnoseRssHandoffFailure(output)
    expect(diagnostic).toEqual({ phase: 'article-retrieval', reason: 'redirect_identity_mismatch' })
    expect(JSON.stringify(diagnostic)).not.toMatch(/private-credential|smart-networks/)
  })

  it('still fails closed if saving skip memory fails, without attempting another candidate', async () => {
    const processCandidate = vi.fn(async () => {
      if (isFlashRssArticleRedirectIdentityMismatch(message)) throw new Error('Persistence unavailable')
      return 'complete' as const
    })
    await expect(runFlashRssStageNextAttempts({ candidates: [first, second], maxAttempts: 3, processCandidate }))
      .rejects.toThrow('Persistence unavailable')
    expect(processCandidate).toHaveBeenCalledOnce()
  })

  it('keeps the three-attempt limit even if every candidate has a known redirect rejection', async () => {
    const processCandidate = vi.fn(async () => 'skip' as const)
    expect(await runFlashRssStageNextAttempts({ candidates: [1, 2, 3, 4], maxAttempts: 3, processCandidate }))
      .toEqual({ completed: false, attemptedCount: 3 })
    expect(processCandidate).toHaveBeenCalledTimes(3)
  })
})
