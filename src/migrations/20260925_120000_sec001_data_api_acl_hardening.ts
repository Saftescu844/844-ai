import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- SEC-001
    -- Payload-owned public-schema objects are server-side PostgreSQL state.
    -- Prevent Supabase Data API roles from receiving implicit access.
    --
    -- Fail closed unless the verified STAGING baseline still matches.
    DO $sec001_preflight$
    DECLARE
      v_tables integer;
      v_sequences integer;
      v_functions integer;
      v_views integer;
      v_materialized_views integer;
      v_tables_owned_postgres integer;
      v_sequences_owned_postgres integer;
      v_app_roles integer;
    BEGIN
      IF current_user <> 'postgres' THEN
        RAISE EXCEPTION
          'SEC-001 abort: expected current_user=postgres, got %',
          current_user;
      END IF;

      SELECT count(*) INTO v_tables
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r';

      SELECT count(*) INTO v_sequences
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'S';

      SELECT count(*) INTO v_functions
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public';

      SELECT count(*) INTO v_views
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'v';

      SELECT count(*) INTO v_materialized_views
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'm';

      SELECT count(*) INTO v_tables_owned_postgres
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND pg_get_userbyid(c.relowner) = 'postgres';

      SELECT count(*) INTO v_sequences_owned_postgres
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'S'
        AND pg_get_userbyid(c.relowner) = 'postgres';

      SELECT count(*) INTO v_app_roles
      FROM pg_roles
      WHERE rolname LIKE 'app_%';

      IF v_tables <> 83
        OR v_sequences <> 58
        OR v_functions <> 0
        OR v_views <> 0
        OR v_materialized_views <> 0
        OR v_tables_owned_postgres <> 83
        OR v_sequences_owned_postgres <> 58
        OR v_app_roles <> 0
      THEN
        RAISE EXCEPTION
          'SEC-001 abort: staging baseline drift tables=% sequences=% functions=% views=% matviews=% postgres_tables=% postgres_sequences=% app_roles=%',
          v_tables,
          v_sequences,
          v_functions,
          v_views,
          v_materialized_views,
          v_tables_owned_postgres,
          v_sequences_owned_postgres,
          v_app_roles;
      END IF;
    END
    $sec001_preflight$;

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    REVOKE ALL PRIVILEGES
    ON TABLES
    FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    REVOKE ALL PRIVILEGES
    ON SEQUENCES
    FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    REVOKE EXECUTE
    ON FUNCTIONS
    FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    REVOKE EXECUTE
    ON FUNCTIONS
    FROM PUBLIC;

    REVOKE ALL PRIVILEGES
    ON ALL TABLES IN SCHEMA public
    FROM anon, authenticated;

    REVOKE ALL PRIVILEGES
    ON ALL SEQUENCES IN SCHEMA public
    FROM anon, authenticated;

    -- Self-check the intended ACL result. Any failure aborts this migration.
    DO $sec001_postcheck$
    DECLARE
      v_anon_table_objects integer;
      v_auth_table_objects integer;
      v_anon_sequence_objects integer;
      v_auth_sequence_objects integer;
      v_default_anon_auth_entries integer;
      v_default_public_function_entries integer;
      v_rls_enabled integer;
    BEGIN
      WITH object_acl AS (
        SELECT
          c.oid,
          c.relkind,
          r.rolname AS grantee
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN LATERAL aclexplode(
          coalesce(
            c.relacl,
            acldefault(c.relkind, c.relowner)
          )
        ) a
        LEFT JOIN pg_roles r ON r.oid = a.grantee
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'S')
      )
      SELECT
        count(DISTINCT oid)
          FILTER (WHERE relkind = 'r' AND grantee = 'anon'),
        count(DISTINCT oid)
          FILTER (WHERE relkind = 'r' AND grantee = 'authenticated'),
        count(DISTINCT oid)
          FILTER (WHERE relkind = 'S' AND grantee = 'anon'),
        count(DISTINCT oid)
          FILTER (WHERE relkind = 'S' AND grantee = 'authenticated')
      INTO
        v_anon_table_objects,
        v_auth_table_objects,
        v_anon_sequence_objects,
        v_auth_sequence_objects
      FROM object_acl;

      SELECT count(*) INTO v_default_anon_auth_entries
      FROM pg_default_acl d
      CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      LEFT JOIN pg_roles r ON r.oid = a.grantee
      WHERE d.defaclnamespace = 'public'::regnamespace
        AND d.defaclrole = 'postgres'::regrole
        AND d.defaclobjtype IN ('r', 'S', 'f')
        AND r.rolname IN ('anon', 'authenticated');

      SELECT count(*) INTO v_default_public_function_entries
      FROM pg_default_acl d
      CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      WHERE d.defaclnamespace = 'public'::regnamespace
        AND d.defaclrole = 'postgres'::regrole
        AND d.defaclobjtype = 'f'
        AND a.grantee = 0;

      SELECT count(*) INTO v_rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity;

      IF v_anon_table_objects <> 0
        OR v_auth_table_objects <> 0
        OR v_anon_sequence_objects <> 0
        OR v_auth_sequence_objects <> 0
        OR v_default_anon_auth_entries <> 0
        OR v_default_public_function_entries <> 0
        OR v_rls_enabled <> 0
      THEN
        RAISE EXCEPTION
          'SEC-001 postcheck failed anon_tables=% auth_tables=% anon_sequences=% auth_sequences=% default_entries=% public_function_entries=% rls=%',
          v_anon_table_objects,
          v_auth_table_objects,
          v_anon_sequence_objects,
          v_auth_sequence_objects,
          v_default_anon_auth_entries,
          v_default_public_function_entries,
          v_rls_enabled;
      END IF;
    END
    $sec001_postcheck$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Restore the pre-SEC-001 ACL model for anon/authenticated.
    -- service_role, postgres, storage and auth schemas are intentionally untouched.

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    GRANT ALL PRIVILEGES
    ON TABLES
    TO anon, authenticated;

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    GRANT ALL PRIVILEGES
    ON SEQUENCES
    TO anon, authenticated;

    ALTER DEFAULT PRIVILEGES
    FOR ROLE postgres
    IN SCHEMA public
    GRANT EXECUTE
    ON FUNCTIONS
    TO anon, authenticated;

    GRANT ALL PRIVILEGES
    ON ALL TABLES IN SCHEMA public
    TO anon, authenticated;

    GRANT ALL PRIVILEGES
    ON ALL SEQUENCES IN SCHEMA public
    TO anon, authenticated;
  `)
}
