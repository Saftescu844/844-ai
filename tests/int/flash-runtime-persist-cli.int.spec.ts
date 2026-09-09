import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const script =
  'scripts/flash-runtime-evaluate-persist.ts'

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
   * Testele nu trebuie să poată folosi accidental
   * o cheie Anthropic reală.
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
  'Flash runtime persistent audit CLI',
  () => {
    it(
      'prints help without audit or provider access',
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
          'Flash runtime evaluator — persistent audit',
        )

        expect(
          combined,
        ).toContain(
          '--allow-audit-write',
        )

        expect(
          combined,
        ).toContain(
          '--allow-provider-requests',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects an invalid Flash ID before audit or provider access',
      () => {
        const result =
          runCli([
            '--flash-id',
            'abc',

            '--model',
            'test-model',

            '--allow-audit-write',

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
      'requires an explicit model before audit access',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

            '--allow-audit-write',

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
      'blocks audit writes unless explicitly allowed',
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

        const combined =
          output(
            result,
          )

        expect(
          combined,
        ).toContain(
          'Audit writes are blocked.',
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
      'blocks provider requests after audit writes are allowed',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

            '--model',
            'test-model',

            '--allow-audit-write',
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
      'requires an API key only after both explicit guards',
      () => {
        const result =
          runCli([
            '--flash-id',
            '1',

            '--model',
            'test-model',

            '--allow-audit-write',

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
