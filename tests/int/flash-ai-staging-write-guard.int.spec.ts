import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  assertFlashAiStagingWriteAllowed,
} from '@/lib/flash/ingestion/flashAiStagingWriteGuard'

describe(
  'FlashAI STAGING write guard',
  () => {
    it(
      'blocks the production Supabase database even when write approval is present',
      () => {
        expect(
          () =>
            assertFlashAiStagingWriteAllowed({
              allowWrite:
                true,

              databaseUrl:
                'postgresql://postgres.hyapqvnubhwkwmwudeit:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
            }),
        ).toThrow(
          'FlashAI STAGING write guard detected the production database.',
        )
      },
    )
  },
)

it(
  'blocks write when explicit approval is missing',
  () => {
    expect(
      () =>
        assertFlashAiStagingWriteAllowed({
          allowWrite:
            false,

          databaseUrl:
            'postgresql://postgres.tvtnpcqawaekhmhyfrnc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
        }),
    ).toThrow(
      'FlashAI STAGING write is not explicitly approved.',
    )
  },
)

it(
  'rejects an unknown database even when write approval is present',
  () => {
    expect(
      () =>
        assertFlashAiStagingWriteAllowed({
          allowWrite:
            true,

          databaseUrl:
            'postgresql://postgres.unknownproject:secret@db.example.com:5432/postgres',
        }),
    ).toThrow(
      'FlashAI STAGING write guard rejected an unapproved database.',
    )
  },
)

it(
  'allows only the approved STAGING Supabase database when write approval is present',
  () => {
    expect(
      () =>
        assertFlashAiStagingWriteAllowed({
          allowWrite:
            true,

          databaseUrl:
            'postgresql://postgres.tvtnpcqawaekhmhyfrnc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
        }),
    ).not.toThrow()
  },
)
