import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const script =
  'scripts/flash-engine-rerun-retry-candidate.ts'

const CLI_TEST_TIMEOUT_MS =
  15_000

const stagingEnvironment = {
  RAILWAY_PROJECT_ID:
    '44c37d0f-b300-4462-b001-31259ddae5dd',

  RAILWAY_ENVIRONMENT_ID:
    'a589dc28-1c59-468c-9eb4-351fce8fa17b',

  RAILWAY_SERVICE_ID:
    'e113e429-e2a9-4271-b0a4-6554233037ee',
}

function runCli(
  args:
    string[],

  extraEnvironment:
    Record<
      string,
      string
    > = {},
) {
  const env = {
    ...process.env,
    ...extraEnvironment,
  }

  delete env.ANTHROPIC_API_KEY
  delete env.DATABASE_URL

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
  'Flash Engine retry-candidate rerun CLI',
  () => {
    it(
      'prints help without Payload or database access',
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
          'controlled retry-candidate rerun enqueue',
        )

        expect(
          combined,
        ).toContain(
          '--run-record-id',
        )

        expect(
          combined,
        ).toContain(
          'does NOT call Anthropic during enqueue',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects an invalid run record ID before Payload initialization',
      () => {
        const result =
          runCli(
            [
              '--run-record-id',
              'abc',

              '--allow-job-write',

              '--allow-provider-requests',
            ],
            stagingEnvironment,
          )

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
          'Invalid --run-record-id: abc',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'requires explicit job-write authorization',
      () => {
        const result =
          runCli([
            '--run-record-id',
            '41',

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
          'Flash Engine retry-candidate job writes are blocked.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'requires explicit provider authorization',
      () => {
        const result =
          runCli([
            '--run-record-id',
            '41',

            '--allow-job-write',
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
          'Provider requests are not authorized for this retry-candidate job.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects a wrong Railway target before Payload initialization',
      () => {
        const result =
          runCli(
            [
              '--run-record-id',
              '41',

              '--allow-job-write',

              '--allow-provider-requests',
            ],
            {
              ...stagingEnvironment,

              RAILWAY_SERVICE_ID:
                'wrong-service',
            },
          )

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
          'Target mismatch: RAILWAY_SERVICE_ID.',
        )

        expect(
          combined,
        ).not.toContain(
          'FLASH_ENGINE_RETRY_CANDIDATE_ENQUEUE_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )
  },
)
