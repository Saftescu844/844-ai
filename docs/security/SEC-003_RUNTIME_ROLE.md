# SEC-003 — restricted Payload database runtime (draft)

## Evidence and scope

Base: main `41a4905a19d60a3378ee3b19dffdf52422bd5f45` (PR #268).
Staging: Supabase `tvtnpcqawaekhmhyfrnc`; production: `hyapqvnubhwkwmwudeit`.
On 2026-10-20 the operator confirmed a postgres-prefixed DATABASE_URL username
and disabled Data API in both environments. Earlier catalog audits found postgres
owns 83 public tables and has BYPASSRLS, CREATEDB and CREATEROLE; it is not superuser.
The 83-table manifest was reread from staging for this proposal. Recheck production
independently before approving provisioning; the SQL rejects manifest drift.

High priority: a compromised web process currently has excessive database powers.
Disabled Data API and denied anon/authenticated table grants reduce direct API exposure,
but do not constrain the application's privileged SQL connection.

This PR does not provision either environment. The SQL is deliberately outside
`src/migrations` and is not imported by the application. It creates a NOLOGIN role,
not an active credential. Existing `app_prod2` is neither modified nor reused.

## Implementation

- Opt-in `PAYLOAD_DB_MODE=runtime` disables prodMigrations, schema push and automatic
  database creation. Invalid mode, admin username, known migration-secret variables,
  PAYLOAD_DROP_DATABASE and PAYLOAD_MIGRATING are rejected without printing values.
- Startup checks the actual SQL role, memberships, ownership, effective schema/database
  CREATE, table TRUNCATE and migration-table writes. It also checks that all compiled
  migrations are recorded. New unlisted privilege paths still require infrastructure review.
- `payload_runtime` receives explicit DML on 82 listed application tables, SELECT only
  on payload_migrations, and USAGE/SELECT only on sequences owned by writable tables.
  No ownership, role membership, TRUNCATE, CREATE, function grants or future-object defaults.
- Five policies allow the trusted server role on existing RLS tables. These are NOT
  per-end-user isolation: Payload access controls remain responsible for user authorization.
  The role can read/write all application rows. SQL injection would still be serious.
- No grants or policies are added for anon/authenticated. Data API stays disabled.
- Provisioning runs transactionally and refuses an existing role, changed table/RLS
  manifest, or inherited public-schema CREATE. It intentionally is not rerunnable.
  Future schema changes require a reviewed update to grants before runtime deployment.

## Required deployment design — approval needed, staging first

1. Review CI results and provisioning SQL; record a fresh backup and rollback point.
2. Create a separate migration service/job, using the exact application image/commit.
   Its DATABASE_URL is privileged and its PAYLOAD_DB_MODE is legacy (or unset).
   It runs `npm run db:migrate:up` and verifies migration completeness, then exits.
   Never serve HTTP from it. No automatic trigger is configured by this PR.
3. Remove the privileged pre-deploy migration command from the web service only when
   the separate job and release ordering have been verified. Two URLs in one web
   service are NOT isolation. Audit shared Railway variables, workers and scheduled jobs.
4. After migrations, approve and run the reviewed SQL in staging only. Provision a
   strong login password through a secret-safe channel; enable LOGIN separately.
   Verify Supavisor login syntax, connection limits and verified TLS for the client leg.
5. The web service receives only the payload_runtime DATABASE_URL and
   PAYLOAD_DB_MODE=runtime. No owner/admin connection under any variable name, build
   artifact or shared-variable reference. Variable-name guards cannot prove this absence.
6. Deploy only after explicit approval; verify health, real admin login/Save Draft,
   newsletter confirmation, comment moderation, search indexing and worker execution.
   Repeat the review independently for production after staging acceptance.

## Validation and limitations

CI uses PostgreSQL 17 at 127.0.0.1:5432/ci and the repository's pinned Payload 3.91.0.
The rehearsal refuses other targets before connecting and uses an ephemeral generated
password. It verifies denied DDL/TRUNCATE/migration writes/SET ROLE, unchanged API ACLs,
five scoped policies, startup configuration, authentication and sessions, draft/version
writes, newsletter + segment, comments, search reads and job enqueue/delete.
Email is stubbed and automatic jobs disabled in this isolated test; no provider requests.
It does not replace browser Save Draft, search-index write coverage, actual provider
execution, Supavisor authentication, TLS verification or staging acceptance.

Source verification: Payload v3.91.0 `packages/db-postgres/src/connect.ts` invokes
prodMigrations on production startup and independently handles schema push/database
creation; `packages/drizzle/src/postgres/createExtensions.ts` loops configured extensions.
This application config has no requested extensions.

Until runtime mode is explicitly enabled, legacy behavior and its privilege risk remain.
This draft must not be merged/deployed as evidence that SEC-003 is already remediated.

## Rollback boundaries

Keep the existing deployed image/commit until acceptance. Stop rollout on failed checks.
A temporary return to the previous credential is an explicit, approved restoration of
the old risk; do not do it automatically. Do not DROP ROLE or revoke grants while runtime
connections depend on them. Record all credential changes without recording secret values.
