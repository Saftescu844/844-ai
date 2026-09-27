# Production promotion readiness — controlled staging → main cutover

**Project:** 844-ai.ro  
**Scope:** production-readiness planning only  
**Status:** PRE-CUTOVER / NO PRODUCTION MUTATION AUTHORIZED BY THIS DOCUMENT

---

## 1. Purpose

This document defines the safe path for promoting the modern staging architecture into production.

It exists because production `main` and staging `staging` are no longer small variations of the same application. Staging contains the modern editorial, security, Flash Engine, author, search, comments and migration architecture, while production still runs the older July architecture plus the minimal PUB-001 containment patch.

A direct or blind `staging -> main` merge is therefore explicitly prohibited.

---

## 2. Verified current state

### Git

At the readiness audit performed on 2026-09-27:

- `main` HEAD: `2e39cf16e8b7d64da8e1e712430df4ee30a2fa7a`
- `staging` HEAD: `1b668983f5fb9e9fd0377a4c3565022396e24846`
- branches are diverged
- staging is 554 commits ahead of main
- staging is 7 commits behind main
- GitHub compare reaches the 300-file response cap

This is a release-integration problem, not a routine feature merge.

### Production runtime

The production Railway deployment for the PUB-001 cutover is SUCCESS.

PUB-001 live verification confirms that all automatic rows created after article ID 844 are drafts:

- IDs 845–856
- 12 automatic rows
- `status = draft`
- `_status = draft`
- `published_at IS NULL`

The legacy publisher no longer owns direct publication authority.

---

## 3. Migration-history mismatch

### Staging database

`844-ai-dev` records 17 controlled Payload migrations:

1. `20260730_185012_baseline_current_schema`
2. `20260809_162701_sitesettings_initial_schema`
3. `20260813_150153_search_infrastructure`
4. `20260817_182526_autori_collection_schema`
5. `20260819_102350_articole_autori_relations`
6. `20260823_181759_articles_editorial_status_workflow`
7. `20260825_060427_article_scheduling`
8. `20260829_122921_audit007_newsletter_confirmation_cooldown`
9. `20260901_100156_reg001b1_author_profile_type`
10. `20260901_111927_reg001b2_author_media`
11. `20260901_141009_reg001c4_significant_update_date`
12. `20260902_105310`
13. `20260902_120037`
14. `20260909_074122_reg001d_flash_engine_runs`
15. `20260910_090156_reg001d_flash_engine_job_slug`
16. `20260919_111358_u14_7h_flash_ai_comments`
17. `20260925_120000_sec001_data_api_acl_hardening`

### Production database

`844-ai-prod` currently records only the historical row:

`dev` — batch `-1`

Production `main` does not yet contain `src/migrations/index.ts` and does not configure `prodMigrations`.

Therefore, introducing the staging migration bundle into production without migration-history onboarding would make Payload consider the baseline migration pending.

That must not happen.

---

## 4. Baseline equivalence proof

The production schema was compared read-only against:

`src/migrations/20260730_185012_baseline_current_schema.json`

Verified equality:

- 36 / 36 baseline tables present
- 325 / 325 baseline columns present
- 27 / 27 baseline enum types present with matching values
- 145 / 145 baseline indexes present
- 51 / 51 baseline foreign keys present
- 0 missing tables
- 0 extra baseline-scope tables
- 0 missing columns
- 0 extra baseline-scope columns
- 0 column type mismatches
- 0 nullability mismatches
- 0 missing indexes
- 0 extra non-primary indexes
- 0 missing foreign keys
- 0 extra foreign keys

The only apparent default differences are the expected PostgreSQL implementation of `serial` columns as sequence-backed `nextval(...)` defaults.

Conclusion:

**Production structurally represents the baseline already.**

The baseline migration itself must never be executed against the live production schema because its `up` creates the existing tables and enum types.

Before Payload-managed production migrations can be enabled, production migration history must be onboarded in a controlled, explicitly approved step.

---

## 5. Post-baseline migration risk classes

### Additive / lower-risk schema changes

Examples:

- SiteSettings schema
- Search infrastructure
- Autori schema
- article-author relations
- scheduling/job tables
- newsletter cooldown
- author profile type
- significant editorial update date
- FlashAI schema
- Flash Engine run audit schema
- FlashAI comments target

These remain subject to staging validation and production backup gates.

### Data-sensitive / higher-risk changes

#### Editorial workflow migration

`20260823_181759_articles_editorial_status_workflow`

This migration:

- renames editorial status columns
- changes enum structures
- drops/recreates indexes
- updates Search data
- drops an obsolete enum type

It changes semantics of existing production article data and must be validated against representative pre-existing data before production cutover.

#### Enum extensions

- `20260901_111927_reg001b2_author_media`
- `20260910_090156_reg001d_flash_engine_job_slug`

These alter PostgreSQL enum types and must be applied in controlled sequence.

#### Security ACL hardening

`20260925_120000_sec001_data_api_acl_hardening`

This changes database privileges and belongs at the end of the verified migration chain, with post-migration application checks.

---

## 6. Required promotion gates

### Gate 0 — governance

Before a large production promotion:

- production branch `main` must not rely on direct pushes
- PR-based promotion must be mandatory
- quality checks must run before merge
- branch state must be up to date before merge
- conversation resolution must remain required
- the solo-maintainer flow must not require self-approval

No production governance change is authorized by this document.

### Gate 1 — migration-history onboarding design

Define the exact one-time method that prevents the already-represented baseline from executing on production.

The preferred design must satisfy all of the following:

- no baseline DDL execution on production
- no schema recreation
- no destructive migration command
- full auditability
- explicit production approval before mutation
- recent production backup
- exact before/after verification of `payload_migrations`

No metadata row is inserted by this document.

### Gate 2 — representative non-production migration rehearsal

Before production:

- reproduce the baseline schema in a non-production database
- seed representative anonymized records for existing article states and relations
- apply post-baseline migrations in order
- validate the editorial-status migration specifically
- validate Flash, Autori, Search, Comments and job schema
- validate rollback only where safe and meaningful
- run application startup and integration tests against the migrated schema

Real production personal data must not be copied unnecessarily.

### Gate 3 — release integration branch

Create a dedicated release branch only after Gates 0–2 are satisfied.

The release branch must reconcile:

- modern `staging` code
- production-only PUB-001 history
- migration onboarding requirements
- current production configuration

A blind merge is prohibited.

Required validation:

- full quality gate
- migration status
- build
- TypeScript
- integration tests
- production-like smoke tests
- exact release diff review

### Gate 4 — publisher cutover window

The legacy scheduled publisher must not race the schema/code cutover.

Before production deployment:

- identify the maintenance/cutover window
- ensure no scheduled publisher execution overlaps migration/startup
- preserve draft-only behavior
- do not re-enable any direct-publication path

Any schedule change requires separate explicit production approval.

### Gate 5 — production deployment

Only after explicit approval:

- verify recent backup
- verify exact `main` commit
- verify exact pending migrations
- verify production environment identity
- perform the controlled deployment
- allow only the intended post-baseline migrations to run
- monitor startup logs to terminal SUCCESS

### Gate 6 — post-deployment invariants

Verify immediately:

- homepage and localized routes
- Payload Admin
- article counts
- published vs draft counts
- article version integrity
- published timestamps
- RO/EN alternative links
- Search visibility
- Autori
- FlashAI
- comments
- newsletter
- worker/jobs
- database privileges
- no unexpected automatic publication

### Gate 7 — closeout

Only after successful production verification:

- record exact release commit
- record migration batches
- record deployment ID
- record smoke-test results
- document any deferred issues
- remove temporary release branches only after verification

---

## 7. Explicitly prohibited shortcuts

Do not:

- merge `staging` blindly into `main`
- run `20260730_185012_baseline_current_schema` on production
- enable `PAYLOAD_DB_PUSH=true`
- run `migrate:fresh`
- run `migrate:reset`
- run `migrate:refresh`
- alter production schema manually outside the approved migration-onboarding procedure
- copy secrets into GitHub or documentation
- copy production personal data into test systems without necessity
- change production without explicit approval

---

## 8. Immediate next technical task

The next safe task is:

**Production migration onboarding rehearsal design**

Deliverables:

1. exact baseline-history onboarding procedure;
2. representative non-production migration rehearsal plan;
3. assertions for the editorial-status data transformation;
4. release integration strategy for the 554-commit staging delta;
5. rollback and recovery checkpoints;
6. production-governance prerequisite list.

This work remains staging/documentation/testing only until a separate production approval is given.
