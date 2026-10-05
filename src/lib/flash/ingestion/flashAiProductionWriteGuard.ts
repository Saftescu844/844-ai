const PRODUCTION_SUPABASE_PROJECT_REF =
  'hyapqvnubhwkwmwudeit'

const STAGING_SUPABASE_PROJECT_REF =
  'tvtnpcqawaekhmhyfrnc'

export interface AssertFlashAiProductionWriteAllowedInput {
  allowWrite:
    boolean

  databaseUrl:
    string | null | undefined
}

function extractSupabaseProjectRef(
  databaseUrl: string,
): string | null {
  let parsed: URL

  try {
    parsed =
      new URL(
        databaseUrl,
      )
  } catch {
    return null
  }

  if (
    parsed.protocol !==
      'postgres:' &&
    parsed.protocol !==
      'postgresql:'
  ) {
    return null
  }

  const hostname =
    parsed.hostname
      .toLowerCase()

  const directSuffix =
    '.supabase.co'

  if (
    hostname.startsWith(
      'db.',
    ) &&
    hostname.endsWith(
      directSuffix,
    )
  ) {
    const projectRef =
      hostname.slice(
        3,
        -directSuffix.length,
      )

    return projectRef ||
      null
  }

  if (
    hostname.endsWith(
      '.pooler.supabase.com',
    )
  ) {
    let username: string

    try {
      username =
        decodeURIComponent(
          parsed.username,
        )
    } catch {
      return null
    }

    const prefix =
      'postgres.'

    if (
      !username.startsWith(
        prefix,
      )
    ) {
      return null
    }

    const projectRef =
      username.slice(
        prefix.length,
      )

    return projectRef ||
      null
  }

  return null
}

/**
 * Fail-closed database guard for the controlled first
 * FlashAI production one-shot write.
 *
 * This guard does not authorize publication. It only allows
 * review-draft persistence against the exact production
 * Supabase project after an explicit write approval.
 */
export function assertFlashAiProductionWriteAllowed({
  allowWrite,
  databaseUrl,
}: AssertFlashAiProductionWriteAllowedInput): void {
  if (!allowWrite) {
    throw new Error(
      'FlashAI PRODUCTION write is not explicitly approved.',
    )
  }

  const normalizedDatabaseUrl =
    databaseUrl?.trim()

  if (!normalizedDatabaseUrl) {
    throw new Error(
      'FlashAI PRODUCTION write guard requires DATABASE_URL.',
    )
  }

  const projectRef =
    extractSupabaseProjectRef(
      normalizedDatabaseUrl,
    )

  if (
    projectRef ===
    STAGING_SUPABASE_PROJECT_REF
  ) {
    throw new Error(
      'FlashAI PRODUCTION write guard detected the staging database.',
    )
  }

  if (
    projectRef !==
    PRODUCTION_SUPABASE_PROJECT_REF
  ) {
    throw new Error(
      'FlashAI PRODUCTION write guard rejected an unapproved database.',
    )
  }
}
