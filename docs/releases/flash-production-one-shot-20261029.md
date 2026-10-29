# Controlled production Flash generation — 29 October 2026

## Scope

Build on deployed production main 0a5be825b8668f8ddbef5d07750c959cee232f85 (PR294). Reuse the existing production one-shot entry point and exact environment guards; do not copy staging wholesale or add sources.

- Parse the original RSS publication date strictly, before trusting parser-normalized ISO dates. Filter missing, invalid, future and older-than-30-day dates before allocating the single allowed attempt. A shorter --max-age-days is allowed; a wider window is rejected.
- Pass one captured UTC reference to both preparations and recheck the extracted article publication day before provider access. An explicit candidate URL does not bypass freshness.
- Reuse the validated RO classification only when the EN fetch has identical normalized source content, provenance, source fingerprint, event fingerprint and currently allowed pillar. Independent EN verification, generation, QA and readiness still apply; invalid reuse never falls back to a new classification.
- Reject divergent pillar, Flash type, information status, risk or health metadata before dedup or any write. Existing subcategory checks and atomic reciprocal review-only persistence remain.
- Give each preparation subprocess 180 seconds with forced termination on timeout. Production provider SDK retries are zero: at most three semantic requests for RO (classification, editorial, QA) and two for EN (editorial, QA), no repair. Source retrieval has its existing bounds. A failure terminates or skips the one explicit candidate, with no implicit rerun.
- Errors expose bounded diagnostic categories rather than raw subprocess/provider output.
- Recognize the exact Google primary-link label “This research”, observed on the selected source page. Keep only HTTPS arxiv.org/abs identifiers and search inside main, ignoring footer/navigation and unrelated citations; multiple distinct primary IDs still fail. No host, registry, DOI or pending-identity policy expansion.

No new migration, source registration, schedule, variable, production write, generation or publication is performed by this PR. Existing legacy publishers, translator protections, dependency lock, production web deployment and staging worker are outside scope. Source5 remains primary/Standard/paraphrase, allowIngestion=true and AUTO=false.

## Concrete source preflight (read-only, no provider)

Selected source: production registry **5, Google Research**, registered URL https://research.google/ ; RSS https://research.google/blog/rss/ . It is already enabled, with scan10/day40 and automatic publication off.

Candidate:
https://research.google/blog/the-sleep-framework-a-new-way-for-llms-to-retain-knowledge-in-continual-learning/

Feed publication: 27 October 2026 17:35UTC; extracted original page date: 27 October 2026; 892 main-body words at inspection. HTTP200 and matching final URL. The article explicitly links “This research” to https://arxiv.org/abs/2606.03979 . The revised deterministic adapter yields a single grounded arXiv identity2606.03979 and the 30-day check passes. Keep the difference between this October blog announcement and the June paper chronology in the human review; no universal “without forgetting” claim or productivity extrapolation.

This local preflight validates extraction, explicit identity and freshness, not generation or live Payload persistence. Earlier inspected current articles with pending identities were not sent to AI and did not justify relaxing the grounded-identity gate. No fixture article or old archive candidate is used to force a pair. Re-fetch the exact selected URL and check production duplicate state immediately before any approved run.

## Validation gates

Behavioral tests cover malformed source dates despite normalized parser output, UTC boundaries and invalid window arguments; same-run classification reuse and rejection of changed source content; writer mismatch rejection before transaction/write; child deadline and secret-safe failure categories; Google primary labels, main-only scope, ambiguous IDs and unsafe URLs. Existing CLI environment guards, ingestion, handoff, identity and atomic-writer regression suites also apply. TypeScript, lint, final diff checks and complete PR CI on disposable PostgreSQL must pass on the exact head before operational approval.

## Proposed production proof (not executed)

After explicit merge and one-shot deployment/generation approval, target only:

- Railway project believable-intuition54c46ab1-ebab-491c-bdbe-571a3fce9ceb
- Environment12b22bbd-469f-4cb8-b418-cc2c8e40af6d
- Service flash-rss-production-once6e954363-b055-4032-a501-f5615cc49932
- Supabase hyapqvnubhwkwmwudeit; PAYLOAD_DB_PUSH=false

Pin the reviewed final merge commit. Retain no cron, restartNEVER, Dockerfile.flash-engine-worker, existing variables and region. Leave the production web on PR294 and staging unchanged. Read back the entire staged patch before accepting; do not accept unrelated changes.

```sh
env PAYLOAD_DB_PUSH=false node --import tsx scripts/flash-rss-production-one-shot.ts \
  --model gpt-5.6-terra \
  --allow-provider-requests \
  --allow-production-rss-one-shot \
  --expected-production-service-id 6e954363-b055-4032-a501-f5615cc49932 \
  --source-id 5 \
  --candidate-url https://research.google/blog/the-sleep-framework-a-new-way-for-llms-to-retain-knowledge-in-continual-learning/ \
  --max-items 10 --max-attempts 1 --max-age-days 30
```

Expected maximum: one new reciprocal RO/EN pair, latest drafts in editorial review, automationDecision=review, no publishedAt, common identity, matching classification and preserved source date. No publication permission is granted by the generation approval. A stale, ungrounded or duplicate source produces no pair; a QA or timeout failure must not be retried without diagnosis and a new explicit run decision.

Require terminal service status and script outcome, then read back root/latest versions, reciprocal IDs, source URLs/dates, classification and content. Confirm the four existing published production Flash records and 28 migration records are unchanged. Save the exact new IDs and evidence, then perform human bilingual review. Anonymous URLs for newly created drafts must stay404.

Do not leave a scheduled or restartable generator. After the run, mark it completed and do not redeploy the generation snapshot as a generic smoke test. Publication and any future hourly scheduling are later, separately prepared decisions.
