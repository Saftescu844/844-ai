import {
  expect,
  it,
  vi,
} from 'vitest'

import {
  runFlashAiStagingWriteCommand,
} from '@/lib/flash/ingestion/flashAiStagingWriteCommand'

it(
  'is dry-run by default and does not load Payload or execute a write',
  async () => {
    const loadPayload =
      vi.fn()

    const executeWrite =
      vi.fn()

    const result =
      await runFlashAiStagingWriteCommand({
        allowWrite:
          false,

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
  'blocks production before loading Payload or executing a write',
  async () => {
    const loadPayload =
      vi.fn()

    const executeWrite =
      vi.fn()

    await expect(
      runFlashAiStagingWriteCommand({
        allowWrite:
          true,

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
  'loads Payload once and executes exactly one write on approved STAGING',
  async () => {
    const payload = {
      marker:
        'staging-payload',
    }

    const writeResult = {
      id:
        123,
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
      await runFlashAiStagingWriteCommand({
        allowWrite:
          true,

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
