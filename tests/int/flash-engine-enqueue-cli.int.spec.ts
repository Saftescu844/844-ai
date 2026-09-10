import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const script =
  'scripts/flash-engine-enqueue.ts'

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

  /**
   * Testele nu trebuie să poată folosi accidental
   * providerul sau baza reală.
   */
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
  'Flash Engine controlled enqueue CLI',
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
          'Flash Engine controlled enqueue',
        )

        expect(
          combined,
        ).toContain(
          '--allow-job-write',
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
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects an invalid Flash ID before Payload initialization',
      () => {
        const result =
          runCli(
            [
              '--flash-id',
              'abc',

              '--model',
              'test-model',

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
          'Invalid --flash-id: abc',
        )

        expect(
          output(
            result,
          ),
        ).not.toContain(
          'FLASH_ENGINE_ENQUEUE_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'requires a model before Payload initialization',
      () => {
        const result =
          runCli(
            [
              '--flash-id',
              '7',

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
          'Missing required --model',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'blocks job writes before Railway or Payload access',
      () => {
        const result =
          runCli([
            '--flash-id',
            '7',

            '--model',
            'test-model',

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
          'Flash Engine job writes are blocked.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'blocks provider-capable jobs before Railway or Payload access',
      () => {
        const result =
          runCli([
            '--flash-id',
            '7',

            '--model',
            'test-model',

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
          'Provider requests are not authorized for this Flash Engine job.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects missing Railway STAGING identifiers before Payload initialization',
      () => {
        const result =
          runCli([
            '--flash-id',
            '7',

            '--model',
            'test-model',

            '--allow-job-write',

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
          'Flash Engine enqueue is restricted to the configured STAGING Railway target.',
        )

        expect(
          combined,
        ).toContain(
          'RAILWAY_PROJECT_ID',
        )

        expect(
          combined,
        ).not.toContain(
          'FLASH_ENGINE_ENQUEUE_OK',
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
              '--flash-id',
              '7',

              '--model',
              'test-model',

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

        expect(
          output(
            result,
          ),
        ).toContain(
          'Target mismatch: RAILWAY_SERVICE_ID.',
        )

        expect(
          output(
            result,
          ),
        ).not.toContain(
          'FLASH_ENGINE_ENQUEUE_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )
  },
)
