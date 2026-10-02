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

it(
  'rejects a non-Supabase database that only contains the STAGING project ref as text',
  () => {
    expect(
      () =>
        assertFlashAiStagingWriteAllowed({
          allowWrite:
            true,

          databaseUrl:
            'postgresql://postgres:secret@db.attacker.example:5432/postgres?application_name=tvtnpcqawaekhmhyfrnc',
        }),
    ).toThrow(
      'FlashAI STAGING write guard rejected an unapproved database.',
    )
  },
)

it(
  'allows the known STAGING Supabase direct database host',
  () => {
    expect(
      () =>
        assertFlashAiStagingWriteAllowed({
          allowWrite:
            true,

          databaseUrl:
            'postgresql://postgres:secret@db.tvtnpcqawaekhmhyfrnc.supabase.co:5432/postgres',
        }),
    ).not.toThrow()
  },
)

it(
  'allows the known STAGING Supabase pooler identity',
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

it(
  'rejects the production Supabase pooler identity',
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
