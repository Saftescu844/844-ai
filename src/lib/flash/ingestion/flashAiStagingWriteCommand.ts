import {
  assertFlashAiStagingWriteAllowed,
} from './flashAiStagingWriteGuard'

export interface RunFlashAiStagingWriteCommandInput {
  allowWrite:
    boolean

  databaseUrl:
    string | null | undefined

  loadPayload:
    () => Promise<unknown>

  executeWrite:
    (
      payload: unknown,
    ) => Promise<unknown>
}

export type FlashAiStagingWriteCommandResult =
  | {
      mode: 'dry-run'
      writeAttempted: false
    }
  | {
      mode: 'write'
      writeAttempted: true
      result: unknown
    }

/**
 * Controlled one-shot STAGING write command.
 *
 * Safety order:
 * 1. dry-run exits before Payload
 * 2. environment guard runs before Payload
 * 3. Payload loads only after explicit approval + STAGING DB validation
 * 4. exactly one injected write operation may then run
 */
export async function runFlashAiStagingWriteCommand({
  allowWrite,
  databaseUrl,
  loadPayload,
  executeWrite,
}: RunFlashAiStagingWriteCommandInput): Promise<
  FlashAiStagingWriteCommandResult
> {
  if (!allowWrite) {
    return {
      mode:
        'dry-run',

      writeAttempted:
        false,
    }
  }

  assertFlashAiStagingWriteAllowed({
    allowWrite,
    databaseUrl,
  })

  const payload =
    await loadPayload()

  const result =
    await executeWrite(
      payload,
    )

  return {
    mode:
      'write',

    writeAttempted:
      true,

    result,
  }
}
