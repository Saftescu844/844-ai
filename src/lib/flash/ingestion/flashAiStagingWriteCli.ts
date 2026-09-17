import {
  runFlashAiStagingWriteCommand,
  type FlashAiStagingWriteCommandResult,
} from './flashAiStagingWriteCommand'

const ALLOW_STAGING_FLASH_AI_WRITE_FLAG =
  '--allow-staging-flash-ai-write'

export interface RunFlashAiStagingWriteCliInput {
  argv:
    string[]

  databaseUrl:
    string | null | undefined

  loadPayload:
    () => Promise<unknown>

  executeWrite:
    (
      payload: unknown,
    ) => Promise<unknown>
}

export async function runFlashAiStagingWriteCli({
  argv,
  databaseUrl,
  loadPayload,
  executeWrite,
}: RunFlashAiStagingWriteCliInput): Promise<
  FlashAiStagingWriteCommandResult
> {
  const allowWrite =
    argv.includes(
      ALLOW_STAGING_FLASH_AI_WRITE_FLAG,
    )

  return await runFlashAiStagingWriteCommand({
    allowWrite,
    databaseUrl,
    loadPayload,
    executeWrite,
  })
}
