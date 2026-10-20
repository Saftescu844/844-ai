import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// PostgreSQL schema defaults are additive: SEC-001's IN SCHEMA revocation
// cannot remove the implicit global PUBLIC EXECUTE grant.
// This migration changes only future functions created by postgres.
// Existing function ACLs, managed roles, app_prod2 and table/RLS ACLs are untouched.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $sec002_preflight$
    BEGIN
      IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'SEC-002 requires the postgres migration role';
      END IF;

      -- The audited baseline has no global function-default override.
      -- Refuse custom defaults rather than guessing a reversible rollback.
      IF EXISTS (
        SELECT 1 FROM pg_default_acl
        WHERE defaclrole = 'postgres'::regrole
          AND defaclobjtype = 'f' AND defaclnamespace = 0
      ) THEN
        RAISE EXCEPTION 'SEC-002 global function defaults drifted; review required';
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
      ) THEN
        RAISE EXCEPTION 'SEC-002 public functions appeared; separate ACL review required';
      END IF;

      -- A global revoke cannot remove an explicit schema-level grant.
      IF EXISTS (
        SELECT 1 FROM pg_default_acl d
        CROSS JOIN LATERAL aclexplode(d.defaclacl) a
        WHERE d.defaclrole = 'postgres'::regrole
          AND d.defaclobjtype = 'f'
          AND d.defaclnamespace = 'public'::regnamespace
          AND a.privilege_type = 'EXECUTE'
          AND (a.grantee = 0 OR a.grantee IN (
            'anon'::regrole, 'authenticated'::regrole
          ))
      ) THEN
        RAISE EXCEPTION 'SEC-002 unsafe schema function defaults; review required';
      END IF;
    END
    $sec002_preflight$;

    ALTER DEFAULT PRIVILEGES FOR ROLE postgres
      REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

    DO $sec002_postcheck$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(
          (SELECT defaclacl FROM pg_default_acl
           WHERE defaclrole = 'postgres'::regrole
             AND defaclobjtype = 'f' AND defaclnamespace = 0),
          acldefault('f', 'postgres'::regrole)
        )) a
        WHERE a.grantee <> 'postgres'::regrole
      ) THEN
        RAISE EXCEPTION 'SEC-002 effective global function defaults remain unsafe';
      END IF;
    END
    $sec002_postcheck$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $sec002_rollback_preflight$
    BEGIN
      IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'SEC-002 rollback requires the postgres migration role';
      END IF;

      -- Only undo our exact owner-only global default. Later ACL changes
      -- require reconciliation, not an automatic broadening of permissions.
      IF NOT EXISTS (
        SELECT 1 FROM pg_default_acl d
        WHERE d.defaclrole = 'postgres'::regrole
          AND d.defaclobjtype = 'f' AND d.defaclnamespace = 0
          AND cardinality(d.defaclacl) = 1
          AND EXISTS (
            SELECT 1 FROM aclexplode(d.defaclacl) a
            WHERE a.grantee = 'postgres'::regrole
              AND a.grantor = 'postgres'::regrole
              AND a.privilege_type = 'EXECUTE'
              AND NOT a.is_grantable
          )
      ) THEN
        RAISE EXCEPTION 'SEC-002 rollback defaults drifted; review required';
      END IF;
    END
    $sec002_rollback_preflight$;

    -- Restore the audited pre-migration default for FUTURE functions only.
    -- Existing functions created after up remain restricted.
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres
      GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
  `)
}
