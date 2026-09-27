import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- DB-001B
    -- First controlled RLS probe on a sensitive table.
    -- Payload connects as postgres (BYPASSRLS), so server-side CMS access remains intact.
    -- No anon/authenticated policies are added: fail closed if Data API access is ever reintroduced.

    DO $db001b_preflight$
    DECLARE
      v_owner text;
      v_rls boolean;
      v_force_rls boolean;
      v_policy_count integer;
    BEGIN
      IF current_user <> 'postgres' THEN
        RAISE EXCEPTION
          'DB-001B abort: expected current_user=postgres, got %',
          current_user;
      END IF;

      SELECT
        pg_get_userbyid(c.relowner),
        c.relrowsecurity,
        c.relforcerowsecurity
      INTO
        v_owner,
        v_rls,
        v_force_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'newsletter'
        AND c.relkind = 'r';

      IF v_owner IS NULL THEN
        RAISE EXCEPTION 'DB-001B abort: public.newsletter not found';
      END IF;

      SELECT count(*)
      INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'newsletter';

      IF v_owner <> 'postgres'
        OR v_rls
        OR v_force_rls
        OR v_policy_count <> 0
      THEN
        RAISE EXCEPTION
          'DB-001B abort: unexpected baseline owner=% rls=% force_rls=% policies=%',
          v_owner,
          v_rls,
          v_force_rls,
          v_policy_count;
      END IF;
    END
    $db001b_preflight$;

    ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

    DO $db001b_postcheck$
    DECLARE
      v_rls boolean;
      v_force_rls boolean;
      v_policy_count integer;
    BEGIN
      SELECT
        c.relrowsecurity,
        c.relforcerowsecurity
      INTO
        v_rls,
        v_force_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'newsletter'
        AND c.relkind = 'r';

      SELECT count(*)
      INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'newsletter';

      IF NOT v_rls
        OR v_force_rls
        OR v_policy_count <> 0
      THEN
        RAISE EXCEPTION
          'DB-001B postcheck failed rls=% force_rls=% policies=%',
          v_rls,
          v_force_rls,
          v_policy_count;
      END IF;
    END
    $db001b_postcheck$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Revert only the RLS flag introduced by DB-001B.
    -- No policies or grants are created or removed by this migration.

    DO $db001b_down_preflight$
    DECLARE
      v_policy_count integer;
    BEGIN
      SELECT count(*)
      INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'newsletter';

      IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
          'DB-001B down abort: newsletter has % RLS policies; refusing to disable RLS automatically',
          v_policy_count;
      END IF;
    END
    $db001b_down_preflight$;

    ALTER TABLE public.newsletter DISABLE ROW LEVEL SECURITY;
  `)
}
