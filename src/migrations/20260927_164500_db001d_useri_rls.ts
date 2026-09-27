import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- DB-001D
    -- Enable RLS on the Payload auth users table.
    -- Payload connects as postgres (BYPASSRLS), so server-side auth/user access remains intact.
    -- No anon/authenticated policies are added: fail closed if Data API access is ever reintroduced.

    DO $db001d_preflight$
    DECLARE
      v_owner text;
      v_rls boolean;
      v_force_rls boolean;
      v_policy_count integer;
    BEGIN
      IF current_user <> 'postgres' THEN
        RAISE EXCEPTION
          'DB-001D abort: expected current_user=postgres, got %',
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
        AND c.relname = 'useri'
        AND c.relkind = 'r';

      IF v_owner IS NULL THEN
        RAISE EXCEPTION 'DB-001D abort: public.useri not found';
      END IF;

      SELECT count(*)
      INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'useri';

      IF v_owner <> 'postgres'
        OR v_rls
        OR v_force_rls
        OR v_policy_count <> 0
      THEN
        RAISE EXCEPTION
          'DB-001D abort: unexpected baseline owner=% rls=% force_rls=% policies=%',
          v_owner,
          v_rls,
          v_force_rls,
          v_policy_count;
      END IF;
    END
    $db001d_preflight$;

    ALTER TABLE public.useri ENABLE ROW LEVEL SECURITY;

    DO $db001d_postcheck$
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
        AND c.relname = 'useri'
        AND c.relkind = 'r';

      SELECT count(*)
      INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'useri';

      IF NOT v_rls
        OR v_force_rls
        OR v_policy_count <> 0
      THEN
        RAISE EXCEPTION
          'DB-001D postcheck failed rls=% force_rls=% policies=%',
          v_rls,
          v_force_rls,
          v_policy_count;
      END IF;
    END
    $db001d_postcheck$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Revert only the RLS flag introduced by DB-001D.

    DO $db001d_down_preflight$
    DECLARE
      v_policy_count integer;
    BEGIN
      SELECT count(*)
      INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'useri';

      IF v_policy_count <> 0 THEN
        RAISE EXCEPTION
          'DB-001D down abort: useri has % RLS policies; refusing to disable RLS automatically',
          v_policy_count;
      END IF;
    END
    $db001d_down_preflight$;

    ALTER TABLE public.useri DISABLE ROW LEVEL SECURITY;
  `)
}
