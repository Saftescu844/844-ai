import {
  readFile,
} from 'node:fs/promises'

import type {
  Payload,
} from 'payload'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashAiDraftProjection,
} from '@/lib/flash/ingestion/articleCandidateFlashAiDraftProjection'

import {
  runFlashAiStagingWriteCli,
} from '@/lib/flash/ingestion/flashAiStagingWriteCli'

import {
  createFlashAiDraftWithFinalDedupGuard,
} from '@/lib/flash/ingestion/payloadFlashAiFinalDedupWriter'

interface StagingWriteInput {
  candidate:
    FlashNormalizedArticleCandidate

  projection:
    FlashAiDraftProjection
}

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
  StagingWriteInput
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
    ) as Partial<StagingWriteInput>

  if (
    !parsed.candidate ||
    !parsed.projection
  ) {
    throw new Error(
      'FlashAI STAGING write input requires candidate and projection.',
    )
  }

  if (
    typeof parsed
      .candidate
      .canonicalUrl !==
      'string' ||
    !parsed
      .candidate
      .canonicalUrl
      .trim()
  ) {
    throw new Error(
      'FlashAI STAGING write input requires candidate canonicalUrl.',
    )
  }

  if (
    typeof parsed
      .projection
      .eventFingerprint !==
      'string' ||
    !parsed
      .projection
      .eventFingerprint
      .trim()
  ) {
    throw new Error(
      'FlashAI STAGING write input requires grounded eventFingerprint.',
    )
  }

  return parsed as StagingWriteInput
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
