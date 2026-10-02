import pg from 'pg'

import {
  applyProductionMigrationOnboarding,
  inspectProductionMigrationOnboarding,
} from '../src/lib/productionMigrationOnboarding'

const {
  Pool,
} = pg

const EXPECTED_PROJECT_REF =
  'hyapqvnubhwkwmwudeit'

const EXPECTED_CONFIRMATION =
  '844-ai-prod'

function projectRefFromConnectionString(
  connectionString:
    string,
): string | null {
  try {
    const url =
      new URL(
        connectionString,
      )

    const username =
      decodeURIComponent(
        url.username,
      )

    const usernameMatch =
      username.match(
        /postgres\.([a-z0-9]+)/i,
      )

    const hostnameMatch =
      url.hostname.match(
        /^db\.([a-z0-9]+)\.supabase\.co$/i,
      )

    return (
      usernameMatch?.[1] ??
      hostnameMatch?.[1] ??
      null
    )
  } catch {
    return null
  }
}

async function main() {
  const apply =
    process.argv.includes(
      '--apply',
    )

  const connectionString =
    process.env
      .DATABASE_URL
      ?.trim()

  if (
    !connectionString
  ) {
    throw new Error(
      'DATABASE_URL is not configured.',
    )
  }

  const projectRef =
    projectRefFromConnectionString(
      connectionString,
    )

  if (
    projectRef !==
      EXPECTED_PROJECT_REF
  ) {
    throw new Error(
      `Production database refused. Expected ${EXPECTED_PROJECT_REF}, detected ${projectRef ?? 'unknown'}.`,
    )
  }

  if (
    process.env
      .PAYLOAD_DB_PUSH ===
    'true'
  ) {
    throw new Error(
      'PAYLOAD_DB_PUSH=true is forbidden for production onboarding.',
    )
  }

  if (
    apply &&
    process.env
      .PRODUCTION_ONBOARDING_CONFIRM !==
      EXPECTED_CONFIRMATION
  ) {
    throw new Error(
      `APPLY requires PRODUCTION_ONBOARDING_CONFIRM=${EXPECTED_CONFIRMATION}.`,
    )
  }

  const pool =
    new Pool({
      connectionString,
      max:
        1,
    })

  try {
    if (
      !apply
    ) {
      const preflight =
        await inspectProductionMigrationOnboarding(
          pool,
        )

      console.log(
        'PRODUCTION_ONBOARDING_DRY_RUN_OK',
      )

      console.dir(
        preflight,
        {
          depth:
            null,
        },
      )

      return
    }

    const result =
      await applyProductionMigrationOnboarding(
        pool,
      )

    console.log(
      'PRODUCTION_ONBOARDING_APPLY_OK',
    )

    console.dir(
      result,
      {
        depth:
          null,
      },
    )
  } finally {
    await pool.end()
  }
}

main().catch(
  error => {
    console.error(
      'PRODUCTION_ONBOARDING_FAILED',
    )

    console.error(
      error instanceof Error
        ? error.message
        : error,
    )

    process.exit(
      1,
    )
  },
)
