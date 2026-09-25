# SEC-001 — Supabase Data API ACL hardening

## Status

Implementation prepared on a dedicated branch.

This change is **not deployed** and **not applied** to staging or production.

## Current verified staging baseline

Project: `844-ai-dev`  
Supabase ref: `tvtnpcqawaekhmhyfrnc`

Verified before implementation preparation:

- 83 tables in `public`;
- 58 sequences in `public`;
- 0 functions in `public`;
- 0 views and 0 materialized views in `public`;
- all 83 tables are owned by `postgres`;
- all 58 sequences are owned by `postgres`;
- 0/83 tables have RLS enabled;
- `anon`, `authenticated`, and `service_role` currently have broad default object privileges;
- no `app_*` application role exists in staging;
- Payload and Railway services use direct PostgreSQL access rather than a browser Supabase Data API client;
- PostgREST is configured without a usable exposed schema (`pg_pgrst_no_exposed_schemas` observed in logs).

## Security goal

Payload-owned application tables are server-side PostgreSQL state.

The migration removes unnecessary direct database privileges for:

- `anon`;
- `authenticated`.

It intentionally preserves:

- `postgres`;
- `service_role`;
- schema ownership;
- RLS state;
- Supabase Storage;
- Supabase Auth.

It also changes the `postgres` default privileges so future Payload migrations do not automatically recreate the same `anon` / `authenticated` access.

## Migration

`20260925_120000_sec001_data_api_acl_hardening`

### Up

The migration:

1. revokes future table privileges from `anon` and `authenticated`;
2. revokes future sequence privileges from those roles;
3. revokes future function EXECUTE privileges from those roles;
4. removes default PUBLIC function execution;
5. revokes existing privileges on all `public` tables from `anon` and `authenticated`;
6. revokes existing privileges on all `public` sequences from those roles.

It does **not**:

- enable RLS;
- revoke `USAGE` on schema `public`;
- modify `service_role`;
- modify `supabase_admin`;
- modify `storage.*`;
- modify `auth.*`;
- touch production.

## Transactional dry-run

Before this implementation was prepared, the exact ACL hardening logic was simulated in staging inside:

```text
BEGIN
→ ACL hardening
→ assertions
→ ROLLBACK
```

The successful dry-run confirmed that, inside the transaction:

- `anon` retained privileges on 0/83 tables and 0/58 sequences;
- `authenticated` retained privileges on 0/83 tables and 0/58 sequences;
- `service_role` privileges remained unchanged;
- ownership remained `postgres`;
- RLS remained disabled;
- default `anon` / `authenticated` privileges for future objects were removed.

After rollback, the original ACL baseline was verified as restored.

## Executable preflight / abort conditions

The migration itself performs a fail-closed preflight before any ACL change.

It aborts if the verified staging baseline has drifted, including if the current user is not `postgres`, object counts/ownership have changed, public functions/views have appeared, or an `app_*` role exists.

Do not apply SEC-001 if any of these have changed:

- `current_user` is not `postgres`;
- public object ownership no longer matches the verified baseline;
- staging has gained an `app_*` role;
- the application has started using Supabase Data API / `supabase-js` for Payload tables;
- public functions or views have been introduced without separate review;
- migration history is no longer aligned with the repository;
- staging database identity cannot be confirmed as `tvtnpcqawaekhmhyfrnc`.

Re-evaluate instead of adapting the migration ad hoc.

## Post-apply verification

After eventual application in staging:

1. verify `anon` has no table/sequence privileges in `public`;
2. verify `authenticated` has no table/sequence privileges in `public`;
3. verify `service_role` is unchanged;
4. verify all application object ownership remains `postgres`;
5. verify RLS state is unchanged;
6. verify Payload admin login and CRUD;
7. verify public article/Flash reads;
8. verify media upload/read/delete using a test fixture;
9. verify newsletter staging flow;
10. verify Flash/Payload Jobs and migration status;
11. verify the migration self-check completed without error;
12. inspect Railway and PostgreSQL logs.

## Rollback

The migration `down` restores the pre-SEC-001 `anon` / `authenticated` table, sequence, and default privileges.

Rollback should be used only while this remains the latest ACL change. If later migrations intentionally alter the same permissions, reconcile the desired ACL state instead of running `down` blindly.

## Production

Production is explicitly out of scope for this change.

Production currently differs from staging and includes the PostgreSQL login role `app_prod2`, which must be reviewed separately before any production ACL migration.
