# Flash AI — production one-shot readiness (10 October 2026)

**Status:** PREPARATION ONLY / NOT AUTHORIZED TO RUN.  
**Scope:** First controlled RSS-generated RO/EN *review-draft* pair after PR #222.  
**No production mutation is authorized by this document.** There is no authorization to merge, deploy, change variables, execute provider requests, write to the production database or publish.

## Verified baseline (read-only audit)

- GitHub: PR #222 merged into `main`, merge commit `ae1cf95dcbb908c0d4f9d244cc49ebe5dc22a19c`. CI passed on the PR head. The source script `scripts/flash-rss-production-one-shot.ts` is identical in `main` and `staging` at audit time.
- Railway: project `believable-intuition`, environment `production`. The main `844-ai` service deployed PR #222 successfully. Its migration pre-deploy applied `20261007_134000_flash_rss_candidate_skip_memory` and `20261009_200000_flash_editorial_subcategories` successfully.
- Railway: existing `flash-rss-production-once` service ID `6e954363-b055-4032-a501-f5615cc49932`. It is **pinned to old commit** `c1ae37d602bd54e7e9a7e05a64b0ac0d51ed302b`, has **no cron**, restart policy **NEVER**, and uses an explicit inert `startCommand`:
  `node -e "console.log('FLASH_RSS_PRODUCTION_ONE_SHOT_READY_NO_RUN')"`.
- **Safety warning:** `Dockerfile.flash-engine-worker` has a runnable worker as its default `CMD`. Do not remove the Railway inert `startCommand` when pinning or redeploying the new image.
- The dedicated one-shot service has `DATABASE_URL`, `PAYLOAD_SECRET` and `PAYLOAD_DB_PUSH`, but **no `OPENAI_API_KEY`**. Railway OAuth returns variable *names* rather than values; `PAYLOAD_DB_PUSH=false` has **not** been proven from its stored value.
- Supabase production: 25 Payload migrations (including the two above); 1,006 editorial articles (731 published); 4 Flash AI articles (all published). These are a **baseline only**, not targets for alteration.
- Eligible RSS sources: Google Research (ID 5) and MIT News — AI (ID 6); both active, `allow_ingestion=true`, `allow_auto_publish=false`. Live feed/candidate freshness and duplication must be rechecked close to execution.
- GitHub encrypted logical backup and real restore rehearsal were reported complete by the administrator. The logical dump of schema `public` is not a complete Supabase Auth/Storage backup.

## Non-negotiable boundaries

1. Preserve production database/data, existing public articles and the main web service.
2. Do not enable any cron, automation, `allowAutoPublish`, automatic publish or scheduled retries.
3. Do not automatically follow `main` on the dedicated one-shot service; pin a **reviewed exact SHA**, updated immediately before an authorized preparation deployment.
4. Keep the explicit **inert** Railway `startCommand`, Dockerfile path, no-cron configuration and `restartPolicyType=NEVER` unchanged through the preparation deployment.
5. Never copy keys from staging or put credentials in PRs, logs, or the chat. A legitimate `OPENAI_API_KEY` must be set securely on the dedicated production service, after separate approval.
6. `PAYLOAD_DB_PUSH` must be exactly `false`, independently verified before execution. The exact production Railway project/environment/service identity and Supabase project ref are required by code.
7. Generation requires a **second, explicit approval** after the inert deployment, separate from permission to prepare the service. Publishing is a **third, separate approval**.

## Preparation sequence — NOT YET AUTHORIZED FOR RAILWAY

A. Recheck exact current `main` SHA, CI tests, and code invariants, including:
`tests/int/flash-rss-production-one-shot.int.spec.ts`,
`tests/int/flash-ai-atomic-review-pair-writer.int.spec.ts`,
`tests/int/flash-editorial-subcategories.int.spec.ts`,
`tests/int/flash-ai-excerpt.int.spec.ts`.

B. After explicit administrator approval to **prepare the production service**, stage a source pin of `flash-rss-production-once` to that reviewed SHA **in the specific production environment only**. Check the staged diff. Preserve inert `startCommand`, no cron, restart policy NEVER and Dockerfile. Do not touch `844-ai`.

C. After explicit approval, configure the dedicated service's `OPENAI_API_KEY` with a valid authorized key, and independently confirm `PAYLOAD_DB_PUSH=false`. Do not reveal stored values. Prefer staging/reviewing changes before a controlled inert-only deployment. Beware that even a variable change may cause a deployment unless appropriately staged/suppressed.

D. After **separate deployment approval**, apply the reviewed production one-shot service preparation only. Inspect new build, effective config, deployment status and runtime logs: inert marker, no provider requests, no DB writes, no scheduler. Check public main app health and Supabase counts remain unchanged. If in doubt, abort; restore the preceding inert build without running migrations down.

## Separate future one-shot generation approval

1. Choose **exactly one** active source ID 5 or 6 and one confirmed RSS candidate URL; verify source content, timestamp, primary-source evidence, source permissions and duplicate checks.
2. Run optional *read-only* preflight/dedup preview with approved provider usage only if necessary. This does not authorize persistence.
3. Only after explicit generation authorization, execute the existing `scripts/flash-rss-production-one-shot.ts` on the exact dedicated production service with the required guards and approved candidate. The code caps attempts at **1**, requires matching grounded RO/EN event identity, performs QA and final dedup, then persists one atomic pair.
4. Target editorial state for both languages: `editorial_status=review`, `automation_decision=review`, `_status=draft`; reciprocal `versiune_alternativa_id`, identical event fingerprint and editorial subcategory, nonempty verified excerpts, 500–1000-word editorial quality contract. Neither article is published by the generator.
5. Compare read-only before/after snapshots in `flash_ai`, verify precisely two new linked drafts (or zero on a fail-closed skip), no duplicate event or source and no changes to prior articles; check Railway logs without secret exposure.
6. Restore the inert start command after the approved one-time run, confirm no cron and no further execution. **Do not publish** before editorial and explicit publication approval.

## Current decision gate

The code path is already present and tested; do **not** develop another generator or rerun existing migrations. The only next production operation to request is **separately approved inert-only preparation** of the existing one-shot service. Until then, all production resources remain untouched.
