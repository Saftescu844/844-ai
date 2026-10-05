import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  assertFlashAiProductionWriteAllowed,
} from '@/lib/flash/ingestion/flashAiProductionWriteGuard'

describe(
  'FlashAI PRODUCTION write guard',
  () => {
    it(
      'blocks write when explicit approval is missing',
      () => {
        expect(
          () =>
            assertFlashAiProductionWriteAllowed({
              allowWrite:
                false,

              databaseUrl:
                'postgresql://postgres.hyapqvnubhwkwmwudeit:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
            }),
        ).toThrow(
          'FlashAI PRODUCTION write is not explicitly approved.',
        )
      },
    )

    it(
      'rejects the known staging Supabase database',
      () => {
        expect(
          () =>
            assertFlashAiProductionWriteAllowed({
              allowWrite:
                true,

              databaseUrl:
                'postgresql://postgres.tvtnpcqawaekhmhyfrnc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
            }),
        ).toThrow(
          'FlashAI PRODUCTION write guard detected the staging database.',
        )
      },
    )

    it(
      'rejects an unknown database',
      () => {
        expect(
          () =>
            assertFlashAiProductionWriteAllowed({
              allowWrite:
                true,

              databaseUrl:
                'postgresql://postgres:secret@db.attacker.example:5432/postgres?application_name=hyapqvnubhwkwmwudeit',
            }),
        ).toThrow(
          'FlashAI PRODUCTION write guard rejected an unapproved database.',
        )
      },
    )

    it(
      'allows the exact production Supabase pooler identity',
      () => {
        expect(
          () =>
            assertFlashAiProductionWriteAllowed({
              allowWrite:
                true,

              databaseUrl:
                'postgresql://postgres.hyapqvnubhwkwmwudeit:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
            }),
        ).not.toThrow()
      },
    )

    it(
      'allows the exact production Supabase direct database host',
      () => {
        expect(
          () =>
            assertFlashAiProductionWriteAllowed({
              allowWrite:
                true,

              databaseUrl:
                'postgresql://postgres:secret@db.hyapqvnubhwkwmwudeit.supabase.co:5432/postgres',
            }),
        ).not.toThrow()
      },
    )
  },
)
