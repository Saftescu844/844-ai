import { runProductionScheduledChild } from '../src/lib/flash/ingestion/flashProductionScheduledChild'
import { assertProductionScheduleEnvironment, PRODUCTION_RSS_SOURCE_IDS, selectAndReserveProductionCandidate } from '../src/lib/flash/ingestion/flashProductionSchedulePolicy'
import { planFlashRssIngestionSources, parseFlashRssCandidates, type FlashRssCandidate } from '../src/lib/flash/ingestion/rssCandidateIngestion'
import { fetchFlashRssFeedXml } from '../src/lib/flash/ingestion/rssFeedRetriever'
import { filterFlashRssFreshCandidates } from '../src/lib/flash/ingestion/flashPublicationFreshness'
import { canonicalFlashRssCandidateUrl } from '../src/lib/flash/ingestion/rssCandidateSkipMemory'

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    console.log('Production scheduled RSS: --allow-production-rss-schedule --model gpt-5.6-terra [--dry-run]. Exact production service only; sources5/6; 30days; one candidate/run; two reserved attempts/rolling24h; five semantic AI requests/attempt; review drafts only. Dry-run has no AI or writes.')
    return
  }
  if (!process.argv.includes('--allow-production-rss-schedule')) throw new Error('Production RSS schedule is not explicitly enabled.')
  assertProductionScheduleEnvironment(process.env)
  const dryRun = process.argv.includes('--dry-run')
  const index = process.argv.indexOf('--model')
  const model = index >= 0 ? process.argv[index + 1] : null
  if (model !== 'gpt-5.6-terra') throw new Error('Production schedule requires the reviewed model gpt-5.6-terra.')
  if (!dryRun && !process.env.OPENAI_API_KEY?.trim()) throw new Error('Production schedule requires provider configuration.')
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')])
  const payload = await getPayload({ config })
  const discovered: FlashRssCandidate[] = []
  const plans = (await planFlashRssIngestionSources(payload)).filter(plan =>
    PRODUCTION_RSS_SOURCE_IDS.some(id => id === plan.sourceId) && plan.ready && plan.allowAutoPublish === false,
  )
  let successfulFeeds = 0
  for (const plan of plans) {
    try {
      const xml = await fetchFlashRssFeedXml({ feedUrl: plan.feedUrl!, registeredSourceUrl: plan.registeredSourceUrl })
      discovered.push(...(await parseFlashRssCandidates(plan, xml, { maxItems: 10 })).candidates)
      successfulFeeds += 1
    } catch {
      console.log('FLASH_RSS_PRODUCTION_SCHEDULE_FEED_FAILED', JSON.stringify({ sourceId: plan.sourceId }))
    }
  }
  if (plans.length > 0 && successfulFeeds === 0) throw new Error('No enabled feed could be retrieved.')

  // Transaction-level lock works with both direct/session and transaction poolers.
  // It covers selection + the durable reservation, not slow provider requests.
  const client = await payload.db.pool.connect()
  let selected: Awaited<ReturnType<typeof selectAndReserveProductionCandidate<FlashRssCandidate>>>
  try {
    await client.query('BEGIN')
    const lock = await client.query('SELECT pg_try_advisory_xact_lock($1, $2) AS locked', [844, 20261029])
    if (lock.rows[0]?.locked !== true) {
      console.log('FLASH_RSS_PRODUCTION_SCHEDULE_BUSY')
      return
    }
    const now = Date.now()
    const sources = await Promise.all(PRODUCTION_RSS_SOURCE_IDS.map(id => payload.findByID({ collection: 'surse', id, depth: 0, overrideAccess: true })))
    const existing = await payload.find({ collection: 'flash-ai', depth: 0, draft: true, pagination: false, overrideAccess: true })
    const usedUrls = new Set(existing.docs.flatMap(doc => (doc.surseFlash ?? []).flatMap(source => {
      const url = canonicalFlashRssCandidateUrl(source.url)
      return url ? [url] : []
    })))
    const fresh = filterFlashRssFreshCandidates(discovered, { now, maxAgeDays: 30 })
    selected = await selectAndReserveProductionCandidate({
      candidates: fresh.candidates, sources, usedUrls, now, dryRun,
      saveMemory: async (id, memory) => { await payload.update({ collection: 'surse', id, data: { rssCandidateSkipMemory: memory }, overrideAccess: true }) },
    })
    console.log('FLASH_RSS_PRODUCTION_SCHEDULE_SELECTION', JSON.stringify({
      dryRun, outcome: selected.outcome, sourceId: selected.candidate?.sourceId,
      articleUrl: selected.candidate?.concreteUrl, attemptsIn24h: selected.attemptsIn24h,
      discovered: discovered.length, freshnessRejected: fresh.filteredCount,
    }))
  } finally {
    // Payload owns its writes; this transaction owns only the advisory lock.
    await client.query('ROLLBACK').finally(() => client.release())
  }
  if (dryRun || !selected.candidate) return
  const candidate = selected.candidate
  const result = await runProductionScheduledChild(candidate.sourceId, candidate.concreteUrl)
  console.log('FLASH_RSS_PRODUCTION_SCHEDULE_RESULT', JSON.stringify({ sourceId: candidate.sourceId, articleUrl: candidate.concreteUrl, ...result }))
  if (result.outcome === 'failed') throw new Error('Production scheduled preparation failed; reservation retained, no automatic retry.')
}

main().then(() => process.exit(0)).catch(() => {
  // Never forward provider output, database errors, article text or credentials.
  console.error('FLASH_RSS_PRODUCTION_SCHEDULE_FAILED')
  process.exit(1)
})
