import {
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  spawnSync,
} from 'node:child_process'

import {
  getPayload,
} from 'payload'
import config from '@payload-config'

import {
  buildFlashAiStagingWriteInputFromHandoffValue,
} from '@/lib/flash/ingestion/flashAiStagingWriteHandoff'

import {
  linkFlashAiReciprocalAlternatives,
} from '@/lib/flash/ingestion/payloadFlashAiReciprocalAlternativeLinker'

const ALLOW_FLAG =
  '--allow-staging-rss-pair-write'

const PROVIDER_FLAG =
  '--allow-provider-requests'

const ONE_SHOT_SERVICE_ID =
  '7be51b73-dc87-4a53-9ad4-879c00aecad6'

const STAGING_PROJECT_ID =
  '44c37d0f-b300-4462-b001-31259ddae5dd'

const STAGING_ENVIRONMENT_ID =
  'a589dc28-1c59-468c-9eb4-351fce8fa17b'

function argument(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index < 0 ||
    !process.argv[index + 1]
  ) {
    return null
  }

  const value =
    process.argv[
      index + 1
    ]?.trim()

  if (
    !value ||
    value.startsWith('--')
  ) {
    return null
  }

  return value
}

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function assertStagingOneShot(): void {
  const mismatches:
    string[] = []

  if (
    process.env
      .RAILWAY_PROJECT_ID !==
    STAGING_PROJECT_ID
  ) {
    mismatches.push(
      'RAILWAY_PROJECT_ID',
    )
  }

  if (
    process.env
      .RAILWAY_ENVIRONMENT_ID !==
    STAGING_ENVIRONMENT_ID
  ) {
    mismatches.push(
      'RAILWAY_ENVIRONMENT_ID',
    )
  }

  if (
    process.env
      .RAILWAY_SERVICE_ID !==
    ONE_SHOT_SERVICE_ID
  ) {
    mismatches.push(
      'RAILWAY_SERVICE_ID',
    )
  }

  if (
    process.env
      .PAYLOAD_DB_PUSH !==
    'false'
  ) {
    mismatches.push(
      'PAYLOAD_DB_PUSH',
    )
  }

  if (
    mismatches.length > 0
  ) {
    throw new Error(
      `FLASH RSS pair ingest is restricted to the configured STAGING one-shot service. Mismatch: ${mismatches.join(', ')}.`,
    )
  }
}

function runTsx(
  scriptPath: string,
  args: string[],
): void {
  const result =
    spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        scriptPath,
        ...args,
      ],
      {
        cwd:
          process.cwd(),
        env:
          process.env,
        stdio:
          'inherit',
      },
    )

  if (
    result.error
  ) {
    throw result.error
  }

  if (
    result.status !== 0
  ) {
    throw new Error(
      `Child command failed: ${scriptPath} (exit ${String(result.status)})`,
    )
  }
}

async function loadHandoff(
  filePath: string,
) {
  const raw =
    await readFile(
      filePath,
      'utf8',
    )

  return buildFlashAiStagingWriteInputFromHandoffValue(
    JSON.parse(raw) as unknown,
  )
}

async function resolveDraftId({
  eventFingerprint,
  language,
}: {
  eventFingerprint: string
  language: 'ro' | 'en'
}): Promise<number> {
  const payload =
    await getPayload({
      config,
    })

  const result =
    await payload.find({
      collection:
        'flash-ai',
      depth:
        0,
      draft:
        true,
      overrideAccess:
        true,
      pagination:
        false,
      where: {
        and: [
          {
            eventFingerprint: {
              equals:
                eventFingerprint,
            },
          },
          {
            limba: {
              equals:
                language,
            },
          },
        ],
      },
    })

  const eligible =
    result.docs.filter(
      document =>
        document._status ===
          'draft' &&
        document.editorialStatus ===
          'draft' &&
        document.automationDecision ===
          'review' &&
        !document.publishedAt,
    )

  if (
    eligible.length !== 1
  ) {
    throw new Error(
      `Expected exactly one eligible ${language.toUpperCase()} draft for event fingerprint; found ${String(eligible.length)}.`,
    )
  }

  return eligible[0].id
}

async function transitionPairToReview(
  roId: number,
  enId: number,
): Promise<void> {
  const payload =
    await getPayload({
      config,
    })

  await linkFlashAiReciprocalAlternatives({
    payload,
    roId,
    enId,
  })

  for (
    const id of
      [roId, enId]
  ) {
    const current =
      await payload.findByID({
        collection:
          'flash-ai',
        id,
        depth:
          0,
        draft:
          true,
        overrideAccess:
          true,
      })

    if (
      current._status !==
        'draft' ||
      current.automationDecision !==
        'review' ||
      current.publishedAt
    ) {
      throw new Error(
        `FlashAI ${String(id)} is not eligible for review transition.`,
      )
    }

    if (
      current.editorialStatus ===
        'review'
    ) {
      continue
    }

    if (
      current.editorialStatus !==
        'draft'
    ) {
      throw new Error(
        `FlashAI ${String(id)} must be editorial draft before review transition.`,
      )
    }

    await payload.update({
      collection:
        'flash-ai',
      id,
      data: {
        editorialStatus:
          'review',
        automationDecision:
          'review',
        _status:
          'draft',
      },
      draft:
        true,
      overrideAccess:
        true,
    })
  }
}

async function main(): Promise<void> {
  assertStagingOneShot()

  if (
    !hasFlag(
      ALLOW_FLAG,
    )
  ) {
    throw new Error(
      `Real STAGING pair writes require ${ALLOW_FLAG}.`,
    )
  }

  if (
    !hasFlag(
      PROVIDER_FLAG,
    )
  ) {
    throw new Error(
      `Provider-backed generation requires ${PROVIDER_FLAG}.`,
    )
  }

  const sourceIdRaw =
    argument(
      '--source-id',
    )

  const articleUrl =
    argument(
      '--article-url',
    )

  const model =
    argument(
      '--model',
    )

  const sourceId =
    Number(
      sourceIdRaw,
    )

  if (
    !Number.isInteger(
      sourceId,
    ) ||
    sourceId <= 0
  ) {
    throw new Error(
      'A positive --source-id is required.',
    )
  }

  if (!articleUrl) {
    throw new Error(
      '--article-url is required.',
    )
  }

  if (!model) {
    throw new Error(
      '--model is required.',
    )
  }

  const tempDirectory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        '844-flash-rss-pair-',
      ),
    )

  const roHandoff =
    path.join(
      tempDirectory,
      'ro.json',
    )

  const enHandoff =
    path.join(
      tempDirectory,
      'en.json',
    )

  try {
    console.log(
      'FLASH_RSS_PAIR_GENERATE_RO_START',
    )

    runTsx(
      'scripts/flash-html-article-prepersistence-dedup-preview.ts',
      [
        '--source-id',
        String(sourceId),
        '--article-url',
        articleUrl,
        '--target-language',
        'ro',
        '--allow-provider-requests',
        '--model',
        model,
        '--handoff-output',
        roHandoff,
      ],
    )

    console.log(
      'FLASH_RSS_PAIR_GENERATE_EN_START',
    )

    runTsx(
      'scripts/flash-html-article-prepersistence-dedup-preview.ts',
      [
        '--source-id',
        String(sourceId),
        '--article-url',
        articleUrl,
        '--target-language',
        'en',
        '--allow-provider-requests',
        '--model',
        model,
        '--handoff-output',
        enHandoff,
      ],
    )

    const [
      roInput,
      enInput,
    ] =
      await Promise.all([
        loadHandoff(
          roHandoff,
        ),
        loadHandoff(
          enHandoff,
        ),
      ])

    const roFingerprint =
      roInput.projection
        .eventFingerprint
        ?.trim()
        .toLowerCase() ??
      null

    const enFingerprint =
      enInput.projection
        .eventFingerprint
        ?.trim()
        .toLowerCase() ??
      null

    if (
      !roFingerprint ||
      !enFingerprint ||
      roFingerprint !==
        enFingerprint
    ) {
      throw new Error(
        'RO and EN handoffs must have the same grounded event fingerprint before any write.',
      )
    }

    if (
      roInput.projection
        .limba !== 'ro' ||
      enInput.projection
        .limba !== 'en'
    ) {
      throw new Error(
        'RO/EN handoff language mismatch.',
      )
    }

    if (
      roInput.projection
        .automationDecision !==
        'review' ||
      enInput.projection
        .automationDecision !==
        'review'
    ) {
      throw new Error(
        'FLASH RSS pair ingest accepts review-only drafts.',
      )
    }

    console.log(
      'FLASH_RSS_PAIR_HANDOFFS_VERIFIED',
      {
        eventFingerprint:
          roFingerprint,
      },
    )

    runTsx(
      'scripts/flash-ai-staging-write-once.ts',
      [
        '--input-file',
        roHandoff,
        '--allow-staging-flash-ai-write',
      ],
    )

    runTsx(
      'scripts/flash-ai-staging-write-once.ts',
      [
        '--input-file',
        enHandoff,
        '--allow-staging-flash-ai-write',
      ],
    )

    const [
      roId,
      enId,
    ] =
      await Promise.all([
        resolveDraftId({
          eventFingerprint:
            roFingerprint,
          language:
            'ro',
        }),
        resolveDraftId({
          eventFingerprint:
            roFingerprint,
          language:
            'en',
        }),
      ])

    await transitionPairToReview(
      roId,
      enId,
    )

    console.log(
      'FLASH_RSS_PAIR_INGEST_OK',
      {
        sourceId,
        articleUrl,
        roId,
        enId,
        eventFingerprint:
          roFingerprint,
        editorialStatus:
          'review',
        automationDecision:
          'review',
        published:
          false,
      },
    )
  } finally {
    await rm(
      tempDirectory,
      {
        recursive:
          true,
        force:
          true,
      },
    )
  }
}

main()
  .then(
    () =>
      process.exit(
        0,
      ),
  )
  .catch(
    error => {
      console.error(
        'FLASH_RSS_PAIR_INGEST_FAILED',
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
