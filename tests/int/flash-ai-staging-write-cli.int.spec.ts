import {
  expect,
  it,
  vi,
} from 'vitest'

import {
  runFlashAiStagingWriteCli,
} from '@/lib/flash/ingestion/flashAiStagingWriteCli'

it(
  'defaults to dry-run when the explicit STAGING write flag is absent',
  async () => {
    const loadPayload =
      vi.fn()

    const executeWrite =
      vi.fn()

    const result =
      await runFlashAiStagingWriteCli({
        argv:
          [],

        databaseUrl:
          undefined,

        loadPayload,
        executeWrite,
      })

    expect(
      result,
    ).toEqual({
      mode:
        'dry-run',

      writeAttempted:
        false,
    })

    expect(
      loadPayload,
    ).not.toHaveBeenCalled()

    expect(
      executeWrite,
    ).not.toHaveBeenCalled()
  },
)

it(
  'blocks production before loading Payload even when the explicit write flag is present',
  async () => {
    const loadPayload =
      vi.fn()

    const executeWrite =
      vi.fn()

    await expect(
      runFlashAiStagingWriteCli({
        argv: [
          '--allow-staging-flash-ai-write',
        ],

        databaseUrl:
          'postgresql://postgres.hyapqvnubhwkwmwudeit:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',

        loadPayload,
        executeWrite,
      }),
    ).rejects.toThrow(
      'FlashAI STAGING write guard detected the production database.',
    )

    expect(
      loadPayload,
    ).not.toHaveBeenCalled()

    expect(
      executeWrite,
    ).not.toHaveBeenCalled()
  },
)

it(
  'allows exactly one Payload load and one write on explicitly approved STAGING',
  async () => {
    const payload = {
      marker:
        'staging-payload',
    }

    const writeResult = {
      id:
        321,
    }

    const loadPayload =
      vi.fn().mockResolvedValue(
        payload,
      )

    const executeWrite =
      vi.fn().mockResolvedValue(
        writeResult,
      )

    const result =
      await runFlashAiStagingWriteCli({
        argv: [
          '--allow-staging-flash-ai-write',
        ],

        databaseUrl:
          'postgresql://postgres.tvtnpcqawaekhmhyfrnc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',

        loadPayload,
        executeWrite,
      })

    expect(
      loadPayload,
    ).toHaveBeenCalledTimes(
      1,
    )

    expect(
      executeWrite,
    ).toHaveBeenCalledTimes(
      1,
    )

    expect(
      executeWrite,
    ).toHaveBeenCalledWith(
      payload,
    )

    expect(
      result,
    ).toEqual({
      mode:
        'write',

      writeAttempted:
        true,

      result:
        writeResult,
    })
  },
)
