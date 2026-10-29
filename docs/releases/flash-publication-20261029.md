# Flash AI: publication release candidate — 29 October 2026

## Release decision and scope

First production increment: promote the publication excerpt safeguards and the source calendar-date UI/formatting already deployed in staging web `c59bcae3f9f8a57e87456ecf9b07366a7a6b7c41`. Build on current production/main `41a4905a19d60a3378ee3b19dffdf52422bd5f45`, preserving its translator refusal handling, recovery tooling, publisher role checks, dependency lock and security controls.

This is seven implementation files plus four focused test suites, with the staging-validated TSX cache isolation for concurrent CLI subprocesses in CI. The standard publication hook requires a nonempty excerpt of at most 300 characters; alternate Payload locale publication checks the effective latest draft after RBAC. Draft editing remains available. Source dates use a calendar-day input and UTC display in RO/EN; opening the form does not rewrite stored data.

No new migration, dependency update, source registration, scheduler, model request, content import or publication is included. The migration registry and Payload schema stay at the existing 28 migrations. The source-date field already exists; only its Admin component changes. No transfer of staging article IDs or source IDs into production is permitted.

This release completes publication UI prerequisites, not the production Flash ingestion rollout. Subsequent generation must use a separately reviewed production-compatible entry point and an explicitly selected current source article, not the staging-only hourly command.

## Current audit evidence

Read-only audit on 29 October, around 10:20 Europe/Bucharest:

| Item | Production | Staging |
|---|---|---|
| Railway project | believable-intuition / 54c46ab1-ebab-491c-bdbe-571a3fce9ceb | resilient-harmony / 44c37d0f-b300-4462-b001-31259ddae5dd |
| Environment | 12b22bbd-469f-4cb8-b418-cc2c8e40af6d | a589dc28-1c59-468c-9eb4-351fce8fa17b |
| Supabase | hyapqvnubhwkwmwudeit | tvtnpcqawaekhmhyfrnc |
| Web service | c58d786c-cf78-4276-9dea-bb54a8a66012 | e113e429-e2a9-4271-b0a4-6554233037ee |
| Web deployment | d0f2f239-ee7f-48c5-b2a7-0dde1e767557, SUCCESS | 5ba744f8-ed95-4302-ac14-236d84daf167, SUCCESS |
| Web commit | 41a4905a19d60a3378ee3b19dffdf52422bd5f45 | c59bcae3f9f8a57e87456ecf9b07366a7a6b7c41 |
| Source registry | 4/5/6 ingestion enabled, every AUTO off | 4/5/6/8/9/10 ingestion enabled, every AUTO off |
| Pending Railway patch | none | none |

Both Railway environments are named production internally: project identity is mandatory. Production has 28 applied Payload migrations through SEC-002; it does not have the staging RSS run diagnostics migration. Four Flash documents are currently published/approved. The production Flash one-shot service 6e954363-b055-4032-a501-f5615cc49932 remains inert, pinned to ae1cf95, with no cron. The production web pre-deploy is npm run db:migrate:up; this candidate adds zero pending migrations.

Main/staging history diverges by 55/159 exclusive commits, with 133 files different. A direct staging tree replacement would remove production translator safeguards, recovery files and app_prod2 publisher preflight support. This candidate applies selected web changes onto main instead.

Since the prior checkpoint, runs 133–150 produced three review pairs: 158/159 (Anthropic proposed IPO), 160/161 (UNESCO Almaty), 162/163 (Anthropic AI for Science). Latest draft versions are reciprocally associated, review/draft and unpublished. One run, 139, failed in editorial-quality-review with invalid_output_quality_review_retention and no saved pair; 140/141 and subsequent runs completed. Existing EC discovery HTTP 403 remains isolated. The worker was redeployed externally at 22:00 UTC to the same 121966b code; no code promotion is implied by its new deployment ID d436ebd8-5d9e-4bdc-b268-abebadc3ca98.

RO156/EN157 remain published only in staging. Their publication and yesterday’s review batch must not be repeated for this release.

## Validation

Run the focused publication/date tests, publisher authorization and atomic-pair regression tests, TypeScript, lint and diff checks. GitHub PR CI must pass on the exact candidate head, including real disposable-DB tests, migration rehearsal, ACL/isolation checks and production build. Existing staging UI/browser evidence covers the same seven implementation files; the merge candidate still needs its own CI. CI is not a production deployment approval. The first main-based CI attempt passed 1,372 of 1,373 tests but one existing CLI invalid-ID subprocess returned exit 0. Apply TSX_DISABLE_CACHE=1 to the integration-test step, matching staging CI, without weakening any assertion; require a complete new run on the final head.

## Promotion procedure

1. Record the approved PR head, current main, production source pin and deploy, and verify no unexpected pending Railway changes. Check current production health and effective auto-deploy behavior before merging; a main merge must not silently authorize a deploy.
2. Obtain concrete authorization for the merge/deployment. Prepare a patch for only the production web service and the exact reviewed final commit. Leave the inert Flash one-shot and all schedules/variables untouched.
3. Recheck migration history: expected existing 28 names, no new candidate migration. Confirm current recovery options and a recent recoverable backup before the real release window; no backup artifact or restore test has been verified by this code audit. Keep the existing pre-deploy and do not run historical onboarding scripts or SQL migrations.
4. Apply the approved web deployment once. Require SUCCESS, the exact commit, healthy replica and both health endpoints. A failing pre-deploy or schema drift stops release; do not force it through.
5. Check production RO/EN homepage, Flash listing, one published reciprocal article pair, source dates and metadata. Confirm expected production robots behavior, media and Admin login. Verify the date field in a draft form; any Save Draft validation must target an explicitly selected draft and record its prior values. Test rejected publication paths in disposable CI, not by deliberately trying to publish live data.
6. If application regression appears, prepare rollback to d0f2f239-ee7f-48c5-b2a7-0dde1e767557 / 41a4905, reconfirm availability, and obtain rollback authorization. No migration down or database restore is part of the normal rollback for this code-only release.

## Remaining launch work after this increment

Audit the existing production one-shot generation path against the current staging protections (freshness, bounded attempts, source evidence, atomic RO/EN persistence and diagnostics). Prepare the smallest production-safe change and disposable/staging validation needed. Start with current registered sources and mandatory editorial review; do not expand sources to postpone launch. An approved, bounded production proof creates review drafts only; publication and any future hourly schedule are separate explicit operational decisions. Staging drafts are not copied wholesale into production.
