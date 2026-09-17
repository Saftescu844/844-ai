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

/**
 * Fail-closed environment guard for the controlled
 * first FlashAI write.
 *
 * It deliberately accepts only the known STAGING
 * Supabase project and explicitly rejects PROD.
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

  if (
    normalizedDatabaseUrl.includes(
      PRODUCTION_SUPABASE_PROJECT_REF,
    )
  ) {
    throw new Error(
      'FlashAI STAGING write guard detected the production database.',
    )
  }

  if (
    !normalizedDatabaseUrl.includes(
      STAGING_SUPABASE_PROJECT_REF,
    )
  ) {
    throw new Error(
      'FlashAI STAGING write guard rejected an unapproved database.',
    )
  }
}
