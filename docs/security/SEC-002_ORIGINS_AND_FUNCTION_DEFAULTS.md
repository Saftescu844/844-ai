# SEC-002 — Server Actions origins and future function execution

## Scope and status

Prepared for review against staging on 2026-10-20. Not applied to staging or production.
No change to DATABASE_URL, application roles, RLS policies, existing function grants,
Storage, publication state or Railway configuration is included.

- Staging: Supabase `tvtnpcqawaekhmhyfrnc`, Railway `resilient-harmony`.
- Production: Supabase `hyapqvnubhwkwmwudeit`, Railway `believable-intuition`.
- Both Railway environments are internally named `production`; identify by project.
- Baseline staging commit: `15ab49c367a91235bec640e18391b09137820d1d`.
- Audited production deployment commit: `323fe3c16927fa9eb5d30ad301288f7315384168`.

## Server Actions

Remove the entire additional `allowedOrigins` list from `next.config.ts`.
Next.js then compares Origin with the request host / forwarded host, separately
for each deployed hostname. No wildcard tenant domain, localhost exception or
cross-environment exception remains. This does not change authentication or
grant anonymous access to actions.

After an approved staging deployment, verify Payload login and Save Draft through
the actual Railway proxy. A reverse-proxy mismatch must be investigated before
introducing any exact-host exception. Do not restore multi-tenant wildcards.
The database CI does not substitute for this browser/proxy validation.

Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions

## PostgreSQL correction

SEC-001 revoked PUBLIC function execution using `IN SCHEMA public`. PostgreSQL
per-schema defaults only add to global defaults; that statement cannot remove
the built-in global PUBLIC EXECUTE grant. Read-only catalog inspection on both
databases confirmed no global function default override for postgres.

The new Payload migration
`20261020_110000_sec002_function_default_execute` revokes global PUBLIC EXECUTE
for **future functions created by postgres**. Its guards require:

- current_user = postgres;
- no existing global function-default override for postgres (exact audited baseline);
- no functions in public requiring a separate review;
- no explicit public-schema PUBLIC/anon/authenticated EXECUTE defaults for postgres.

The postcheck evaluates global defaults including the built-in fallback.
SEC-001 is not edited or replayed. The new migration is appended to the registry.

### Global effect and compatibility

This necessarily affects future postgres-owned functions in **all schemas**.
Existing functions keep their ACLs. Per-schema explicit grants remain additive,
including the existing service_role grant in public and managed-schema grants.
Future functions needing caller access must receive explicit grants.
No managed-role defaults or app_prod2 defaults are changed. The latter remains
a separate least-privilege review item; this PR does not claim to harden functions
created by every possible role.

This distinction is important for future maintenance or extension SQL executed
as postgres. Review required callers when introducing new functions.

### Rollback

The down migration requires the exact owner-only global ACL produced by up,
then restores the audited global PUBLIC default. It refuses later ACL drift.
This rollback broadens access for functions created **after** rollback; it does
not reopen functions already created under the hardened defaults.
Do not run down without approval and review of the entire Payload migration batch.

Reference: https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html

## Verification

The existing CI runs against disposable localhost PostgreSQL databases only.
A dedicated transaction (always rolled back) checks:

- the actual migration down and up;
- restoration of the original implicit default by down;
- refusal of global-default drift, unsafe schema grants, and new public functions;
- unchanged existing function ACLs, public table ownership/RLS/ACLs, and other defaults;
- denied anonymous/authenticated execution of newly created public functions;
- preserved explicit service_role execution in public;
- restricted defaults for new postgres-owned functions in another schema;
- refusal of rollback after unexpected global grants;
- no reopening of existing hardened functions on down.

The existing public ACL guard now checks effective global postgres function
defaults on both the main CI database and the production-like rehearsal database.
The full existing migration rehearsal continues to validate app_prod2 table and
sequence privileges.

## Release gates

1. Review PR diff and CI results. CI is not a staging/prod migration approval.
2. Obtain explicit approval for merge and staging deployment/migration.
3. Confirm staging database identity and pending migration list before deployment.
4. Verify Payload login, Save Draft, readiness and the read-only ACL postchecks.
5. Production promotion requires separate approval and its normal backup/preflight.

Remember: Payload prodMigrations may execute pending migrations when the new
version initializes. Deploying this change is also a database change.
