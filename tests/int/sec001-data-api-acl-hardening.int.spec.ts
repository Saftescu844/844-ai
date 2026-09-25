import {
  readFileSync,
} from 'node:fs'
import {
  resolve,
} from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const migrationName =
  '20260925_120000_sec001_data_api_acl_hardening'

const migrationSource =
  readFileSync(
    resolve(
      process.cwd(),
      'src/migrations',
      `${migrationName}.ts`,
    ),
    'utf8',
  )

const migrationIndex =
  readFileSync(
    resolve(
      process.cwd(),
      'src/migrations/index.ts',
    ),
    'utf8',
  )

const [
  upSource,
  downSource = '',
] =
  migrationSource.split(
    'export async function down',
  )

describe(
  'SEC-001 Data API ACL hardening migration contract',
  () => {
    it(
      'revokes anon/authenticated access from current and future Payload-owned public objects',
      () => {
        expect(
          upSource,
        ).toContain(
          'REVOKE ALL PRIVILEGES\n    ON TABLES\n    FROM anon, authenticated',
        )

        expect(
          upSource,
        ).toContain(
          'REVOKE ALL PRIVILEGES\n    ON SEQUENCES\n    FROM anon, authenticated',
        )

        expect(
          upSource,
        ).toContain(
          'REVOKE EXECUTE\n    ON FUNCTIONS\n    FROM anon, authenticated',
        )

        expect(
          upSource,
        ).toContain(
          'REVOKE ALL PRIVILEGES\n    ON ALL TABLES IN SCHEMA public\n    FROM anon, authenticated',
        )

        expect(
          upSource,
        ).toContain(
          'REVOKE ALL PRIVILEGES\n    ON ALL SEQUENCES IN SCHEMA public\n    FROM anon, authenticated',
        )
      },
    )

    it(
      'does not broaden SEC-001 into service-role, RLS, schema, storage, auth, or production changes',
      () => {
        expect(
          upSource,
        ).not.toContain(
          'service_role',
        )

        expect(
          upSource,
        ).not.toContain(
          'ENABLE ROW LEVEL SECURITY',
        )

        expect(
          upSource,
        ).not.toContain(
          'REVOKE USAGE ON SCHEMA',
        )

        expect(
          upSource,
        ).not.toContain(
          'supabase_admin',
        )

        expect(
          upSource,
        ).not.toContain(
          'storage.',
        )

        expect(
          upSource,
        ).not.toContain(
          'auth.',
        )

        expect(
          upSource,
        ).not.toContain(
          'app_prod2',
        )
      },
    )

    it(
      'keeps a narrow rollback for anon/authenticated only',
      () => {
        expect(
          downSource,
        ).toContain(
          'GRANT ALL PRIVILEGES\n    ON TABLES\n    TO anon, authenticated',
        )

        expect(
          downSource,
        ).toContain(
          'GRANT ALL PRIVILEGES\n    ON SEQUENCES\n    TO anon, authenticated',
        )

        expect(
          downSource,
        ).toContain(
          'GRANT ALL PRIVILEGES\n    ON ALL TABLES IN SCHEMA public\n    TO anon, authenticated',
        )

        expect(
          downSource,
        ).not.toContain(
          'GRANT EXECUTE\n    ON FUNCTIONS\n    TO PUBLIC',
        )
      },
    )

    it(
      'is registered in the controlled Payload migration index',
      () => {
        expect(
          migrationIndex,
        ).toContain(
          `./${migrationName}`,
        )

        expect(
          migrationIndex,
        ).toContain(
          `name: '${migrationName}'`,
        )
      },
    )
  },
)
