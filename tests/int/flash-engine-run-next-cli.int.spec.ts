import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const script =
  'scripts/flash-engine-run-next.ts'

const CLI_TEST_TIMEOUT_MS =
  15_000

function runCli(
  args:
    string[],
) {
  const env = {
    ...process.env,
  }

  /*
   * CLI guard tests must never be capable
   * of reaching a real database or provider.
   */
  delete env.DATABASE_URL
  delete env.ANTHROPIC_API_KEY

  delete env.RAILWAY_PROJECT_ID
  delete env.RAILWAY_ENVIRONMENT_ID
  delete env.RAILWAY_SERVICE_ID

  delete env.PAYLOAD_DB_PUSH

  return spawnSync(
    process.execPath,
    [
      '--import=tsx/esm',
      script,
      ...args,
    ],
    {
      cwd:
        process.cwd(),

      env,

      encoding:
        'utf8',

      timeout:
        CLI_TEST_TIMEOUT_MS,
    },
  )
}

function output(
  result:
    ReturnType<
      typeof runCli
    >,
): string {
  return [
    result.stdout,
    result.stderr,
  ].join(
    '\n',
  )
}

describe(
  'Flash Engine controlled run-next CLI',
  () => {
    it(
      'prints help without Payload, database, or provider access',
      () => {
        const result =
          runCli([
            '--help',
          ])

        expect(
          result.status,
        ).toBe(
          0,
        )

        const combined =
          output(
            result,
          )

        expect(
          combined,
        ).toContain(
          'Flash Engine controlled run-next',
        )

        expect(
          combined,
        ).toContain(
          '--allow-job-run',
        )

        expect(
          combined,
        ).toContain(
          '--allow-provider-requests',
        )

        expect(
          combined,
        ).toContain(
          'flash-engine-manual',
        )

        expect(
          combined,
        ).toContain(
          'at most one eligible job',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'blocks execution before Railway or Payload access',
      () => {
        const result =
          runCli([
            '--allow-provider-requests',
          ])

        expect(
          result.status,
        ).toBe(
          1,
        )

        expect(
          output(
            result,
          ),
        ).toContain(
          'Flash Engine manual queue execution is blocked.',
        )

        expect(
          output(
            result,
          ),
        ).not.toContain(
          'FLASH_ENGINE_RUN_NEXT_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'blocks provider requests before Railway or Payload access',
      () => {
        const result =
          runCli([
            '--allow-job-run',
          ])

        expect(
          result.status,
        ).toBe(
          1,
        )

        expect(
          output(
            result,
          ),
        ).toContain(
          'Provider requests are not authorized for Flash Engine manual queue execution.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects fully armed execution when STAGING environment is absent',
      () => {
        const result =
          runCli([
            '--allow-job-run',

            '--allow-provider-requests',
          ])

        expect(
          result.status,
        ).toBe(
          1,
        )

        const combined =
          output(
            result,
          )

        expect(
          combined,
        ).toContain(
          'Flash Engine execution is restricted to the configured STAGING environment.',
        )

        expect(
          combined,
        ).toContain(
          'RAILWAY_PROJECT_ID',
        )

        expect(
          combined,
        ).toContain(
          'PAYLOAD_DB_PUSH',
        )

        expect(
          combined,
        ).toContain(
          'ANTHROPIC_API_KEY',
        )

        expect(
          combined,
        ).not.toContain(
          'FLASH_ENGINE_RUN_NEXT_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )
  },
)
