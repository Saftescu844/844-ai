import assert from 'node:assert/strict'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
const label = process.env.DB_GUARD_LABEL ?? 'database'

if (!connectionString) {
  throw new Error('DB-003: DATABASE_URL is required')
}

const client = new pg.Client({ connectionString })

await client.connect()

try {
  const roleResult = await client.query(`
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated')
    ORDER BY rolname
  `)

  assert.deepEqual(
    roleResult.rows.map(({ rolname }) => rolname),
    ['anon', 'authenticated'],
    `DB-003 (${label}): expected anon/authenticated roles to exist`,
  )

  const schemaCreate = await client.query(`
    SELECT
      role_name,
      has_schema_privilege(role_name, 'public', 'CREATE') AS can_create
    FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name)
    ORDER BY role_name
  `)

  const schemaCreateOffenders = schemaCreate.rows.filter(
    ({ can_create }) => can_create === true,
  )

  assert.equal(
    schemaCreateOffenders.length,
    0,
    `DB-003 (${label}): anon/authenticated unexpectedly have CREATE on schema public: ${JSON.stringify(schemaCreateOffenders)}`,
  )

  const relationGrants = await client.query(`
    WITH roles(role_name) AS (
      VALUES ('anon'), ('authenticated')
    ),
    objects AS (
      SELECT
        c.oid,
        c.relname,
        c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    )
    SELECT
      roles.role_name,
      objects.relname AS object_name,
      objects.relkind AS object_kind
    FROM roles
    CROSS JOIN objects
    WHERE (
      objects.relkind = 'S'
      AND (
        has_sequence_privilege(roles.role_name, objects.oid, 'USAGE')
        OR has_sequence_privilege(roles.role_name, objects.oid, 'SELECT')
        OR has_sequence_privilege(roles.role_name, objects.oid, 'UPDATE')
      )
    )
    OR (
      objects.relkind <> 'S'
      AND (
        has_table_privilege(roles.role_name, objects.oid, 'SELECT')
        OR has_table_privilege(roles.role_name, objects.oid, 'INSERT')
        OR has_table_privilege(roles.role_name, objects.oid, 'UPDATE')
        OR has_table_privilege(roles.role_name, objects.oid, 'DELETE')
        OR has_table_privilege(roles.role_name, objects.oid, 'TRUNCATE')
        OR has_table_privilege(roles.role_name, objects.oid, 'REFERENCES')
        OR has_table_privilege(roles.role_name, objects.oid, 'TRIGGER')
      )
    )
    ORDER BY roles.role_name, objects.relname
  `)

  assert.equal(
    relationGrants.rows.length,
    0,
    `DB-003 (${label}): public-schema relation/sequence privileges leaked to anon/authenticated: ${JSON.stringify(relationGrants.rows)}`,
  )

  const functionGrants = await client.query(`
    WITH roles(role_name) AS (
      VALUES ('anon'), ('authenticated')
    )
    SELECT
      roles.role_name,
      p.oid::regprocedure::text AS function_name
    FROM roles
    CROSS JOIN pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND has_function_privilege(roles.role_name, p.oid, 'EXECUTE')
    ORDER BY roles.role_name, function_name
  `)

  assert.equal(
    functionGrants.rows.length,
    0,
    `DB-003 (${label}): public-schema function EXECUTE leaked to anon/authenticated: ${JSON.stringify(functionGrants.rows)}`,
  )

  const defaultAclLeaks = await client.query(`
    SELECT
      CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE grantee_role.rolname
      END AS grantee,
      owner_role.rolname AS owner,
      d.defaclobjtype AS object_type,
      acl.privilege_type
    FROM pg_default_acl d
    JOIN pg_roles owner_role ON owner_role.oid = d.defaclrole
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    WHERE n.nspname = 'public'
      AND d.defaclobjtype IN ('r', 'S', 'f')
      AND (
        grantee_role.rolname IN ('anon', 'authenticated')
        OR acl.grantee = 0
      )
    ORDER BY owner, object_type, grantee, privilege_type
  `)

  assert.equal(
    defaultAclLeaks.rows.length,
    0,
    `DB-003 (${label}): unsafe default privileges detected in schema public: ${JSON.stringify(defaultAclLeaks.rows)}`,
  )

  console.log(
    `DB-003 PASS (${label}): no public-schema CREATE/object/function/default ACL exposure for anon/authenticated`,
  )
} finally {
  await client.end()
}
