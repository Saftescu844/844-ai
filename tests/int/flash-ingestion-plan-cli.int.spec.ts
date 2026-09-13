import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

const script =
  'scripts/flash-ingestion-plan.ts'

const CLI_TEST_TIMEOUT_MS =
  15_000

const stagingEnvironment = {
  RAILWAY_PROJECT_ID:
    '44c37d0f-b300-4462-b001-31259ddae5dd',
  RAILWAY_ENVIRONMENT_ID:
    'a589dc28-1c59-468c-9eb4-351fce8fa17b',
  RAILWAY_SERVICE_ID:
    'e113e429-e2a9-4271-b0a4-6554233037ee',
  PAYLOAD_DB_PUSH:
    'false',
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

  delete env.DATABASE_URL
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
  'Flash ingestion readiness CLI',
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
          'Flash Engine RSS ingestion readiness',
        )

        expect(
          combined,
        ).toContain(
          'does NOT fetch any feed',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects execution outside the configured Railway STAGING target',
      () => {
        const result =
          runCli([])

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
          'Flash ingestion readiness is restricted to the configured read-only STAGING target.',
        )

        expect(
          combined,
        ).toContain(
          'RAILWAY_PROJECT_ID',
        )

        expect(
          combined,
        ).not.toContain(
          'FLASH_INGESTION_PLAN_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'requires PAYLOAD_DB_PUSH=false before Payload initialization',
      () => {
        const {
          PAYLOAD_DB_PUSH,
          ...withoutDbPush
        } =
          stagingEnvironment

        void PAYLOAD_DB_PUSH

        const result =
          runCli(
            [],
            withoutDbPush,
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
          'Environment mismatch: PAYLOAD_DB_PUSH.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'reports a wrong STAGING service before Payload initialization',
      () => {
        const result =
          runCli(
            [],
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
          'Environment mismatch: RAILWAY_SERVICE_ID.',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )
  },
)
