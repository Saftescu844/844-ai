import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- SEC-001
    -- Payload-owned public-schema objects are server-side PostgreSQL state.
    -- Prevent Supabase Data API roles from receiving implicit access.

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
