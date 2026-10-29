# Initial production RSS schedule — 29 October 2026

Gabriel explicitly approved merge, deployment and schedule activation after the PR296 inert proof. Keep publication manual and use the existing dedicated production service, not the staging worker or web service.

## Execution contract

- Exact project54c46ab1-ebab-491c-bdbe-571a3fce9ceb/environment12b22bbd-469f-4cb8-b418-cc2c8e40af6d/service6e954363-b055-4032-a501-f5615cc49932/nameflash-rss-production-once, production Supabasehyapqvnubhwkwmwudeit and PAYLOAD_DB_PUSH=false. Wrong dimensions fail before Payload access. Fixed modelgpt-5.6-terra.
- Only registered GoogleResearch5 and MITAI6. Both must exist; only active ingestion-ready sources with AUTO=false are scanned. Ten feed items/source, original RSS and article dates within30days, grounded identity, existing writer/dedup/classification/QA gates retained.
- At most one candidate/run and two reserved attempts across both sources per rolling24h. Each attempt uses the existing one-shot (three semantic RO plus two EN requests maximum, SDK retrieszero, child handoffs180sec each). The scheduled parent kills the whole one-shot process group after480sec or20MB output. There is no automatic repair or retry.
- Before calling the one-shot, reserve the attempt through Payload in the existing source JSON memory field. Reservation survives QA errors, timeouts, controlled skips, crashes and a pair not being saved. All attempted URLs are skipped for7days; existing draft/published source URLs are excluded independently. Invalid/future budget memory fails closed; recent reservations are never silently evicted. This is an attempt limit, not a promise of two new pairs per day or a euro-denominated cap.
- Selection and reservation are serialized by a transaction-level advisory lock on a dedicated pg client, compatible with transaction poolers. The short lock transaction contains no CMS SQL writes; the memory write goes through Payload. A failed memory save prevents provider execution. Lock released before provider work; a concurrent later run sees the durable reservation and global budget. Fresh source controls and latest drafts are reread under the lock.
- Reuse existing production one-shot guards/atomic review-pair persistence. No schema/migration, article translation, publication/unpublication, source registration, AUTO change or broad staging promotion.
- Output is fixed event markers and small source/URL/outcome summaries. No raw provider, source body, database error, credential or child stderr is forwarded. A source fetch failure is isolated to that source. A failed generation terminates this run and keeps its reservation.

## Two-stage Railway rollout

Pin the reviewed merge SHA. Keep Dockerfile.flash-engine-worker, region, variables and restartNEVER. Verify the entire pending environment patch before each accept-deploy. User approval covers this rollout; no repeated permission question is needed unless scope materially changes.

1. Deploy with no cron and this read-only preview command:

   `env PAYLOAD_DB_PUSH=false node --import tsx scripts/flash-rss-production-scheduled.ts --allow-production-rss-schedule --model gpt-5.6-terra --dry-run`

   Require terminal success and FLASH_RSS_PRODUCTION_SCHEDULE_SELECTION. Preview may discover/select a candidate or report empty/budget; no reservation, provider or Flash write. Compare Flash/version/migration/source memory/control state before/after.

2. After the preview passes, activate cron **0 6,18 * * *** (UTC06:00/18:00, currently08:00/20:00 Europe/Bucharest;09:00/21:00 during daylight saving). Start command is the same without --dry-run. No restart retries. A platform deployment or manual trigger can consume an attempt; the rolling budget still applies. Never replay the old explicit Sleep generation command.

   Confirm staged changes are only the intended command+cron, then accept. Verify the live cron/start/pin/NEVER config, no unrelated pending changes, production web remains PR294, and inspect any initial execution. A healthy empty/controlled skip is valid; do not force fresh draft creation. If Railway waits for the next cron, report activation separately from an execution that has not happened yet.

3. For every observed execution: record marker/outcome/attempt count and any actual new pair IDs. New pairs must be reciprocal draft/review, automationDecisionreview, publishedAtnull and unavailable anonymously. Preserve existing published1..6. Publication requires later human review and approval. To pause: remove cron and use the inert import smoke command, with no new generation snapshot.

## Focused security changes

Pin only fast-uri3.1.9 and undici7.30.1 through npm overrides and regenerate only their lock entries, retaining the original lock name and install policy. Official patched releases: https://github.com/fastify/fast-uri/releases/tag/v3.1.9 and https://github.com/nodejs/undici/releases/tag/v7.30.1 . Native Node fetch is separate; do not claim its vulnerabilities are fixed by the npm undici override. Other advisories remain tracked by PR296's triage.

Validation: environment/draft/budget/durable-failure/7day-memory/rolling-midnight tests; subprocess marker/error-redaction/process-group-timeout tests; existing one-shot/freshness/handoff/atomic writer suites; TypeScript/lint, full ephemeral-DB CI, dependency inventory, actual Docker import smoke and scheduled --help without network. No live provider/database credentials are used in tests.
