import Parser from 'rss-parser'
import { FLASH_DISCOVERY_CATALOG } from '../src/lib/flash/ingestion/flashDiscoveryCatalog'
import { retrieveFlashSource } from '../src/lib/flash/runtimeEvidence/sourceRetriever'

// Standalone proposal/endpoint check: no Payload, database, model or queue imports.
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log('Usage: tsx scripts/flash-source-catalog-preview.ts [--probe-rss]')
    console.log('Default: print proposal only. --probe-rss: bounded GET of the three catalogued RSS endpoints; no CMS writes or model calls.')
    return
  }
  if (args.some(arg => arg !== '--probe-rss')) throw new Error('Unknown option; use --help.')

  console.log(JSON.stringify({
    status: 'editorial_proposal_not_live_registry',
    sources: FLASH_DISCOVERY_CATALOG,
  }, null, 2))
  if (!args.includes('--probe-rss')) return

  let failures = 0
  // Sequential, bounded probes; do not retry or work around a source refusal.
  for (const source of FLASH_DISCOVERY_CATALOG.filter(item => item.method === 'rss')) {
    const response = await retrieveFlashSource({
      id: source.key,
      registeredSourceUrl: source.sourceUrl,
      concreteUrl: source.discoveryUrl,
    }, { timeoutMs: 15_000, maxBytes: 1_000_000 })
    if (response.failureReason || !response.textContent) {
      failures++
      console.log(JSON.stringify({ key: source.key, status: 'fetch_failed',
        httpStatus: response.statusCode, reason: response.failureReason ?? 'no_text',
        networkPolicyReason: response.networkPolicyReason }))
      continue
    }
    try {
      const feed = await new Parser().parseString(response.textContent)
      const validLinks = feed.items.filter(item => {
        try {
          const url = new URL(item.link ?? '')
          return ['http:', 'https:'].includes(url.protocol)
        } catch { return false }
      }).length
      if (!validLinks) failures++
      console.log(JSON.stringify({ key: source.key,
        status: validLinks ? 'rss_parsed' : 'no_article_links',
        httpStatus: response.statusCode, bytes: response.bytesRead,
        itemCount: feed.items.length, itemsWithHttpLinks: validLinks,
        caveat: 'Endpoint only; relevance, freshness, article retrieval and editorial verification not evaluated.',
      }))
    } catch {
      failures++
      console.log(JSON.stringify({ key: source.key, status: 'rss_parse_failed' }))
    }
  }
  if (failures) process.exitCode = 1
}

main().catch(() => {
  console.error('FLASH_SOURCE_CATALOG_PREVIEW_FAILED; use --help and check endpoint access.')
  process.exitCode = 1
})
