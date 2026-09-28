# Production cutover runbook — daily-backup strategy

**Project:** 844-ai.ro  
**Scope:** controlled modern staging → production cutover  
**Recovery strategy:** scheduled physical backup, no PITR  
**Status:** PRE-CUTOVER / NO PRODUCTION MUTATION AUTHORIZED BY THIS DOCUMENT

---

## 1. Decision

The selected recovery strategy is:

> **Use a fresh scheduled Supabase physical backup and perform the cutover as close to that backup as practical.**

PITR is not enabled and will not be purchased for this cutover unless a later explicit decision changes the plan.

Observed on 2026-09-27:

- scheduled physical backups are available daily;
- latest observed backup: **2026-09-27 01:15:20 UTC**;
- Restore is available;
- recent backups are consecutive;
- Supabase warns that Storage objects are not included in database backups.

This runbook therefore minimizes the rollback-loss window instead of relying on point-in-time recovery.

---

## 2. Hard safety rules

Do not begin production cutover unless all of the following are true:

1. a same-day scheduled physical backup is visible in Supabase;
2. the backup has an available **Restore** action;
3. its exact timestamp is recorded in the cutover log;
4. the release candidate is synchronized with the current `main` and `staging`;
5. the release candidate quality gate is green;
6. `main` remains protected and requires `quality-gate`;
7. no unresolved PR conversation remains;
8. no production publisher run will overlap the migration/deploy window;
9. no manual editorial/media mutation is planned during the window;
10. the database migration connection is confirmed to execute as PostgreSQL `postgres`;
11. explicit production approval has been given for the cutover.

If any item is false, **abort/postpone**. Do not improvise in production.

---

## 3. Preferred cutover window

Recent scheduled backups have appeared around 01:15 UTC.

The legacy Auto-Publisher schedules are:

- 05:00 UTC — RSS
- 11:00 UTC — Health
- 13:00 UTC — Education
- 17:00 UTC — Business

Preferred approach:

- start after the new daily backup appears;
- target start within approximately 60 minutes of the backup;
- finish before the 05:00 UTC publisher run.

If the cutover cannot be performed safely in that quiet interval:

- postpone to the next fresh backup window; **or**
- obtain separate explicit approval for a controlled publisher pause.

Do not silently disable production schedules.

---

## 4. Storage limitation

Supabase scheduled database backups do **not** include Storage objects.

The schema cutover does not intentionally modify Storage files, therefore this is acceptable provided that during the cutover window:

- no media upload is performed deliberately;
- no media object is deleted;
- no bulk storage operation is run.

If a database restore becomes necessary, database metadata will return to the backup timestamp, but Storage objects created or deleted after that timestamp are not rolled back automatically.

---

## 5. Release candidate gate

Historical dry-run evidence:

- release PR: **#129**
- status: **DRAFT / historical evidence only**
- the dry-run quality gate previously completed successfully
- its head no longer matches current `staging`

Since that dry-run, staging has added the five DB-001 RLS hardening migrations and the DB-003 ACL anti-regression CI guard. PR #129 must therefore **not** be treated as a current release candidate and must not be merged.

The historical dry-run remains useful because it validated:

- production-like migration rehearsal;
- migration-history onboarding;
- legacy article visibility preservation;
- `app_prod2` privilege preservation without ownership;
- SEC-001;
- isolated database boundary;
- lint;
- integration tests;
- production build.

Immediately before a real cutover:

1. refresh `main`;
2. refresh `staging`;
3. synchronize the release branch with both histories;
4. review the final diff;
5. rerun `quality-gate`;
6. record the exact final release SHA;
7. do not merge if the head changes after validation.

---

## 6. Production baseline capture

After the fresh backup is confirmed, capture the live production baseline read-only.

Record at minimum:

### Git / Railway

- exact `main` SHA;
- current production deployment ID;
- current production deployment status;
- rollback-capable deployment ID.

### Database

- max article ID;
- article total;
- automatic article total;
- published/draft counts;
- latest automatic `created_at`;
- latest automatic `published_at`;
- `payload_migrations` rows;
- public table count;
- public sequence count;
- public enum count;
- `app_prod2` existence;
- `app_prod2` ownership count;
- `app_prod2` table/sequence privilege coverage.

### Legacy publication authority

Before onboarding, verify:

- legacy column `status` exists;
- modern column `editorial_status` does not yet exist;
- `_status` exists;
- every `status='published'` article has `published_at IS NOT NULL`;
- record the count of root rows where `_status IS DISTINCT FROM status`.

Do not mutate version history.

---

## 7. Migration connection gate — PASS

SEC-001 requires the migration session to execute as PostgreSQL `postgres`.

For this production environment, the effective production database connection role has been confirmed as:

`postgres`

Therefore:

- the existing production `DATABASE_URL` is eligible for Payload migration execution;
- no separate admin migration connection is required;
- no temporary migration secret is required;
- `app_prod2` remains a preserved application role and is not used as the migration owner;
- SEC-001 will still verify that Payload objects remain owned by `postgres`.

Immediately before cutover, re-confirm `current_user = 'postgres'` read-only. If that assertion fails, abort.

---

## 8. One-time production migration-history onboarding

This step is performed while the legacy application is still serving traffic and still treats custom `status` as publication authority.

That makes it safe to align native Payload `_status` before the modern code takes over.

### Required preconditions

Inside a single database transaction verify:

- exactly one `payload_migrations` row exists with `name='dev'` and `batch=-1`;
- no row exists yet for `20260730_185012_baseline_current_schema`;
- baseline schema identity is still valid;
- no legacy published article has null `published_at`;
- record the current root mismatch count.

### Transaction

Perform only these logical operations:

1. align live root article native status:

   `UPDATE articole SET _status = status WHERE _status IS DISTINCT FROM status`

2. assert root mismatch count becomes zero;
3. delete exactly the single historical `dev/-1` marker;
4. insert the baseline migration marker:

   `20260730_185012_baseline_current_schema`, batch 1;

5. commit.

### Explicit exclusions

Do **not**:

- execute baseline DDL;
- recreate tables;
- normalize `_articole_v.version__status`;
- alter article version history;
- change publication timestamps;
- touch Storage.

If any assertion fails, rollback the transaction and abort the cutover.

---

## 9. Payload migration execution

Production startup currently launches the application directly; Railway does **not** automatically run Payload migrations.

For the cutover deploy, the intended controlled sequence is:

1. onboarding transaction succeeds;
2. run `npm run db:migrate:up` using the confirmed admin migration connection;
3. verify all post-baseline migrations complete;
4. only then allow the modern application deployment to become active.

Preferred Railway mechanism:

- use a **pre-deploy command** for the migration step so migration completes before the new replica starts serving;
- do not merge the release PR until the pre-deploy migration configuration is confirmed.

The precise connection variable used by the pre-deploy command depends on Gate 7:

- use `DATABASE_URL` only if its effective database role is `postgres`;
- otherwise use a separate migration-only connection variable.

No Railway production configuration change is authorized by this document.

---

## 10. Expected migration chain

The baseline is marked as already represented and is **not executed**.

Payload should then apply only the post-baseline migrations, in order:

1. `20260809_162701_sitesettings_initial_schema`
2. `20260813_150153_search_infrastructure`
3. `20260817_182526_autori_collection_schema`
4. `20260819_102350_articole_autori_relations`
5. `20260823_181759_articles_editorial_status_workflow`
6. `20260825_060427_article_scheduling`
7. `20260829_122921_audit007_newsletter_confirmation_cooldown`
8. `20260901_100156_reg001b1_author_profile_type`
9. `20260901_111927_reg001b2_author_media`
10. `20260901_141009_reg001c4_significant_update_date`
11. `20260902_105310`
12. `20260902_120037`
13. `20260909_074122_reg001d_flash_engine_runs`
14. `20260910_090156_reg001d_flash_engine_job_slug`
15. `20260919_111358_u14_7h_flash_ai_comments`
16. `20260925_120000_sec001_data_api_acl_hardening`
17. `20260927_152500_db001b_newsletter_rls_probe`
18. `20260927_162500_db001c_useri_sessions_rls`
19. `20260927_164500_db001d_useri_rls`
20. `20260927_170500_db001e_newsletter_segment_rls`
21. `20260927_172500_db001f_comentarii_rls`

Abort if:

- the baseline migration attempts to run;
- any migration reports failure;
- SEC-001 preflight fails;
- an unexpected migration appears;
- migration history differs from the validated release candidate.

---

## 11. Release merge and deploy

Only after a separate explicit production approval:

1. confirm the fresh backup timestamp again;
2. confirm no publisher run has begun;
3. confirm release PR head SHA;
4. confirm `quality-gate = SUCCESS`;
5. confirm `main` branch protection remains active;
6. mark the release PR ready only when all gates are satisfied;
7. merge the release PR into `main`;
8. monitor Railway build;
9. monitor pre-deploy migration command;
10. monitor application startup;
11. require terminal Railway **SUCCESS**;
12. verify the deployed commit equals the approved release commit.

Do not manually trigger Auto-Publisher during validation.

---

## 12. Immediate post-deployment invariants

### Database

Verify:

- baseline migration recorded exactly once;
- legacy `dev/-1` marker absent;
- all expected post-baseline migrations recorded;
- final public table/sequence topology matches the rehearsal;
- `editorial_status` exists;
- old custom `status` is no longer the modern publication authority;
- published article count remains logically preserved;
- no unintended article deletion;
- no unintended `published_at` loss;
- `app_prod2` owns zero Payload objects;
- `app_prod2` retains intended direct PostgreSQL privileges;
- `anon` and `authenticated` have no direct Payload table/sequence privileges after SEC-001.

### Application

Verify:

- `/ro` loads;
- `/en` loads;
- representative published RO article loads;
- representative published EN article loads;
- Payload Admin login works;
- article admin list loads;
- draft article remains hidden publicly;
- published article remains public;
- Search works;
- Autori pages work;
- FlashAI pages/workflow load;
- comments path loads where applicable;
- newsletter flow responds;
- media reads work;
- RO/EN alternative links remain reciprocal.

### Automatic publication

Verify:

- no legacy path directly publishes;
- next scheduled publisher output remains draft-only;
- `published_at` is not created by legacy automation.

---

## 13. Rollback model

The modern schema migration is not safely reversible by Railway code rollback alone.

### Before onboarding transaction commits

Abort with no production mutation.

### After onboarding but before post-baseline migrations

If a serious issue is detected:

- stop;
- do not continue with the release;
- evaluate whether the onboarding state can remain safely idle under the legacy app;
- if exact pre-cutover state is required, restore the fresh Supabase backup.

### After post-baseline migrations begin

Treat rollback as **coupled recovery**:

1. prevent further intentional writes;
2. restore the recorded fresh Supabase database backup;
3. rollback/redeploy Railway to the recorded pre-cutover deployment;
4. verify `main` / deployed code compatibility with restored DB;
5. verify article counts and public visibility;
6. verify newsletter/media metadata consistency;
7. record any Storage changes that occurred after the backup timestamp.

Do not use `payload migrate:down` blindly across the whole chain.

---

## 14. Recovery-loss window

Because PITR is not enabled, a database restore returns to the scheduled backup timestamp.

Therefore any database write after that timestamp may be lost during rollback.

The operational objective is to minimize:

> **backup timestamp → successful cutover verification**

For this reason:

- use the newest backup;
- begin soon after it appears;
- avoid deliberate editorial/newsletter/media changes during the window;
- prefer completing before the first scheduled publisher run;
- postpone rather than accepting an unnecessarily large recovery-loss window.

---

## 15. Closeout

Only after all production invariants pass:

- record final `main` SHA;
- record Railway deployment ID;
- record backup timestamp used as recovery checkpoint;
- record final migration history;
- record smoke-test result;
- confirm Auto-Publisher remains draft-only;
- confirm no rollback is required;
- remove any temporary migration-only secret/variable;
- decide whether the Railway migration pre-deploy command becomes the permanent controlled migration boundary;
- close the release PR/task;
- keep the recovery notes with the release evidence.

---

## 16. Current gate status

As of 2026-09-28:

- PUB-001 live production containment: **PASS**
- production scheduled backup availability: **PASS**
- PITR: **not enabled by design**
- recovery strategy: **daily-backup strategy selected**
- production project status: **ACTIVE_HEALTHY**
- `main` protection: **PASS**
- required `quality-gate`: **PASS**
- DB-001B…DB-001F sensitive-table RLS hardening in staging: **PASS**
- DB-002 proportional-hardening review: **PASS / no unnecessary expansion**
- DB-003 ACL anti-regression CI guard: **PASS**
- current staging migration bundle: **22 migrations total / 21 post-baseline**
- release dry-run PR #129: **historical evidence only / stale against current staging / DO NOT MERGE**
- migration rehearsal: **PASS**
- production-like `app_prod2` rehearsal: **PASS**
- production database migration role: **postgres / PASS**
- production mutation approval for full cutover: **NOT GIVEN**

No production mutation is required now. Normal staging development may continue. When a real cutover is scheduled, refresh the release candidate from the then-current `main` and `staging`, rerun the complete quality gate and migration rehearsal, and obtain separate explicit production approval before any production change.
