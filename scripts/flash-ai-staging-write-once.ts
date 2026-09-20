import {
  readFile,
} from 'node:fs/promises'

import type {
  Payload,
} from 'payload'

import {
  buildFlashAiStagingWriteInputFromHandoffValue,
} from '@/lib/flash/ingestion/flashAiStagingWriteHandoff'

import type {
  FlashAiStagingWriteInput,
} from '@/lib/flash/ingestion/flashAiStagingWriteInput'

import {
  runFlashAiStagingWriteCli,
} from '@/lib/flash/ingestion/flashAiStagingWriteCli'

import {
  createFlashAiDraftWithFinalDedupGuard,
} from '@/lib/flash/ingestion/payloadFlashAiFinalDedupWriter'

function argument(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index === -1 ||
    index + 1 >=
      process.argv.length
  ) {
    return null
  }

  const value =
    process.argv[
      index + 1
    ]?.trim()

  if (
    !value ||
    value.startsWith(
      '--',
    )
  ) {
    return null
  }

  return value
}

function hasWriteFlag(): boolean {
  return process.argv.includes(
    '--allow-staging-flash-ai-write',
  )
}

async function loadInput(): Promise<
  FlashAiStagingWriteInput
> {
  const inputFile =
    argument(
      '--input-file',
    )

  if (!inputFile) {
    throw new Error(
      'Real STAGING write requires --input-file.',
    )
  }

  const raw =
    await readFile(
      inputFile,
      'utf8',
    )

  const parsed =
    JSON.parse(
      raw,
    ) as unknown

  return buildFlashAiStagingWriteInputFromHandoffValue(
    parsed,
  )
}

async function main(): Promise<void> {
  const writeRequested =
    hasWriteFlag()

  /**
   * Input-ul real nu este citit în dry-run.
   */
  const input =
    writeRequested
      ? await loadInput()
      : null

  const result =
    await runFlashAiStagingWriteCli({
      argv:
        process.argv.slice(
          2,
        ),

      databaseUrl:
        process.env
          .DATABASE_URL,

      loadPayload:
        async () => {
          const [
            payloadModule,
            configModule,
          ] =
            await Promise.all([
              import(
                'payload'
              ),
              import(
                '@payload-config'
              ),
            ])

          return await payloadModule
            .getPayload({
              config:
                configModule
                  .default,
            })
        },

      executeWrite:
        async payload => {
          if (!input) {
            throw new Error(
              'FlashAI STAGING write input is unavailable.',
            )
          }

          return await createFlashAiDraftWithFinalDedupGuard({
            payload:
              payload as Payload,

            candidate:
              input.candidate,

            projection:
              input.projection,
          })
        },
    })

  if (
    result.mode ===
    'dry-run'
  ) {
    console.log(
      'FLASH_AI_STAGING_WRITE_DRY_RUN_OK',
    )

    console.log({
      writeAttempted:
        false,
      payloadLoaded:
        false,
    })

    return
  }

  const created =
    result.result as {
      id?: unknown
      slug?: unknown
      limba?: unknown
      editorialStatus?: unknown
      automationDecision?: unknown
      _status?: unknown
    }

  console.log(
    'FLASH_AI_STAGING_WRITE_OK',
  )

  console.log({
    id:
      created.id,
    slug:
      created.slug,
    limba:
      created.limba,
    editorialStatus:
      created.editorialStatus,
    automationDecision:
      created.automationDecision,
    status:
      created._status,
  })
}

main()
  .then(
    () => {
      process.exit(
        0,
      )
    },
  )
  .catch(
    error => {
      console.error(
        'FLASH_AI_STAGING_WRITE_FAILED',
      )

      console.error(
        error instanceof Error
          ? error.message
          : error,
      )

      process.exit(
        1,
      )
    },
  )
