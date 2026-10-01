const STAGING_SUPABASE_PROJECT_REF =
  'tvtnpcqawaekhmhyfrnc'

const PRODUCTION_SUPABASE_PROJECT_REF =
  'hyapqvnubhwkwmwudeit'

export interface AssertFlashAiStagingWriteAllowedInput {
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
 * Fail-closed environment guard for the controlled
 * first FlashAI write.
 *
 * It accepts only a structurally identified connection
 * to the known STAGING Supabase project and explicitly
 * rejects PROD.
 */
export function assertFlashAiStagingWriteAllowed({
  allowWrite,
  databaseUrl,
}: AssertFlashAiStagingWriteAllowedInput): void {
  if (!allowWrite) {
    throw new Error(
      'FlashAI STAGING write is not explicitly approved.',
    )
  }

  const normalizedDatabaseUrl =
    databaseUrl?.trim()

  if (!normalizedDatabaseUrl) {
    throw new Error(
      'FlashAI STAGING write guard requires DATABASE_URL.',
    )
  }

  const projectRef =
    extractSupabaseProjectRef(
      normalizedDatabaseUrl,
    )

  if (
    projectRef ===
    PRODUCTION_SUPABASE_PROJECT_REF
  ) {
    throw new Error(
      'FlashAI STAGING write guard detected the production database.',
    )
  }

  if (
    projectRef !==
    STAGING_SUPABASE_PROJECT_REF
  ) {
    throw new Error(
      'FlashAI STAGING write guard rejected an unapproved database.',
    )
  }
}
