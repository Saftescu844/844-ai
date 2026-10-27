// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { diagnoseRssSourceDiscoveryFailure } from '@/lib/flash/ingestion/rssSourceDiscoveryDiagnostic'
import { fetchFlashRssFeedXml } from '@/lib/flash/ingestion/rssFeedRetriever'

const urls = { feedUrl: 'https://example.org/feed', registeredSourceUrl: 'https://example.org/' }

async function retrievalFailure(fetchImpl: typeof fetch) {
  try { await fetchFlashRssFeedXml({ ...urls, fetchImpl }) } catch (error) {
    return diagnoseRssSourceDiscoveryFailure(error, 'retrieval')
  }
  throw new Error('Expected fixture retrieval failure')
}

describe('bounded RSS source discovery diagnostics', () => {
  it.each([403, 429, 500, 503])('records HTTP %i from the real retriever without its response body', async status => {
    const result = await retrievalFailure(async () => new Response('secret-body', { status }))
    expect(result).toEqual({ phase: 'retrieval', reason: 'http_error', httpStatus: status })
    expect(JSON.stringify(result)).not.toContain('secret-body')
  })

  it('distinguishes an aborted request from an unknown network failure', async () => {
    expect(await retrievalFailure(async () => { throw new DOMException('private context', 'AbortError') }))
      .toEqual({ phase: 'retrieval', reason: 'timeout', httpStatus: null })
    expect(await retrievalFailure(async () => { throw new TypeError('private network detail') }))
      .toEqual({ phase: 'retrieval', reason: 'retrieval_error', httpStatus: null })
  })

  it.each([
    ['RSS retrieval redirected outside the registered source host.', 'redirect_outside_source'],
    ['RSS feed exceeds the configured size limit.', 'size_limit'],
    ['RSS retrieval failed with HTTP 200.', 'retrieval_error'],
    ['RSS retrieval failed with HTTP 403. secret-context', 'retrieval_error'],
  ])('classifies only fixed retriever messages: %s', (message, reason) => {
    expect(diagnoseRssSourceDiscoveryFailure(new Error(message), 'retrieval'))
      .toEqual({ phase: 'retrieval', reason, httpStatus: null })
  })

  it('does not label parser errors as HTTP failures or serialize unknown thrown values', () => {
    expect(diagnoseRssSourceDiscoveryFailure(new Error('RSS retrieval failed with HTTP 403.'), 'parsing'))
      .toEqual({ phase: 'parsing', reason: 'parse_error', httpStatus: null })
    expect(diagnoseRssSourceDiscoveryFailure({ message: 'secret-context', cause: 'secret' }, 'retrieval'))
      .toEqual({ phase: 'retrieval', reason: 'retrieval_error', httpStatus: null })
  })
})
