import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const script =
  'scripts/flash-runtime-evaluate.ts'

const CLI_TEST_TIMEOUT_MS =
  15_000

function runCli(
  args:
    string[],
) {
  const env = {
    ...process.env,
  }

  /**
   * Testele CLI nu trebuie să poată folosi accidental
   * o cheie reală din mediul dezvoltatorului sau CI.
   */
  delete env.ANTHROPIC_API_KEY

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
        15_000,
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
  'Flash runtime CLI',
  () => {
    it(
      'prints help without provider access',
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

        expect(
          output(
            result,
          ),
        ).toContain(
          'Flash runtime evaluator — read-only',
        )

        expect(
          output(
            result,
          ),
        ).toContain(
          '--allow-provider-requests',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects an invalid Flash ID before provider access',
      () => {
        const result =
          runCli([
            '--flash-id',
            'abc',

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
          'Invalid --flash-id: abc',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'requires an explicit model',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

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
          'Missing required --model',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects a missing model value before provider access',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

            '--model',
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
          'Missing required --model',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'blocks provider requests unless explicitly allowed',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

            '--model',
            'test-model',
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
          'Provider requests are blocked.',
        )

        expect(
          combined,
        ).not.toContain(
          'ANTHROPIC_API_KEY is not configured.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'requires an API key only after provider requests are allowed',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

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
          'ANTHROPIC_API_KEY is not configured.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )
  },
)
