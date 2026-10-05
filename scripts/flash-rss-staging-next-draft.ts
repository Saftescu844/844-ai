import {
  readFile,
  rm,
} from 'node:fs/promises'
import {
  spawnSync,
} from 'node:child_process'
import path from 'node:path'

import {
  planFlashRssIngestionSources,
  parseFlashRssCandidates,
} from '@/lib/flash/ingestion/rssCandidateIngestion'
import {
  fetchFlashRssFeedXml,
} from '@/lib/flash/ingestion/rssFeedRetriever'

const STAGING_PROJECT_ID =
  '44c37d0f-b300-4462-b001-31259ddae5dd'

const STAGING_ENVIRONMENT_ID =
  'a589dc28-1c59-468c-9eb4-351fce8fa17b'

const ONE_SHOT_SERVICE_ID =
  '7be51b73-dc87-4a53-9ad4-879c00aecad6'

const ALLOW_FLAG =
  '--allow-staging-rss-next-draft'

function argument(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index < 0 ||
    !process.argv[
      index + 1
    ]
  ) {
    return null
  }

  const value =
    process.argv[
      index + 1
    ]?.trim()

  return value &&
    !value.startsWith('--')
    ? value
    : null
}

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function parsePositiveInteger(
  value: string | null,
  name: string,
): number {
  const parsed =
    Number(value)

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer.`,
    )
  }

  return parsed
}

function assertStagingOneShot(
  environment:
    NodeJS.ProcessEnv =
      process.env,
): void {
  const mismatches:
    string[] = []

  if (
    environment.RAILWAY_PROJECT_ID !==
    STAGING_PROJECT_ID
  ) {
    mismatches.push(
      'RAILWAY_PROJECT_ID',
    )
  }

  if (
    environment.RAILWAY_ENVIRONMENT_ID !==
    STAGING_ENVIRONMENT_ID
  ) {
    mismatches.push(
      'RAILWAY_ENVIRONMENT_ID',
    )
  }

  if (
    environment.RAILWAY_SERVICE_ID !==
    ONE_SHOT_SERVICE_ID
  ) {
    mismatches.push(
      'RAILWAY_SERVICE_ID',
    )
  }

  if (
    environment.PAYLOAD_DB_PUSH !==
    'false'
  ) {
    mismatches.push(
      'PAYLOAD_DB_PUSH',
    )
  }

  if (mismatches.length) {
    throw new Error(
      `FLASH-014 is restricted to the dedicated STAGING one-shot service. Mismatch: ${mismatches.join(', ')}.`,
    )
  }
}

function runTsx(
  args: string[],
): string {
  const result =
    spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        ...args,
      ],
      {
        cwd:
          process.cwd(),
        env:
          process.env,
        encoding:
          'utf8',
        maxBuffer:
          8 * 1024 * 1024,
      },
    )

  const stdout =
    result.stdout ?? ''
  const stderr =
    result.stderr ?? ''

  if (
    result.status !== 0
  ) {
    throw new Error(
      [
        `Command failed: ${args.join(' ')}`,
        stdout,
        stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  return stdout
}

async function createPayload() {
  const [
    payloadModule,
    configModule,
  ] =
    await Promise.all([
      import('payload'),
      import('@payload-config'),
    ])

  return payloadModule
    .getPayload({
      config:
        configModule.default,
    })
}

type HandoffShape = {
  targetLanguage?: unknown
  readiness?: {
    sourceGroundedValues?: {
      eventFingerprint?: unknown
    }
  }
}

async function readEventFingerprint(
  filePath: string,
): Promise<string> {
  const parsed =
    JSON.parse(
      await readFile(
        filePath,
        'utf8',
      ),
    ) as HandoffShape

  const fingerprint =
    parsed.readiness
      ?.sourceGroundedValues
      ?.eventFingerprint

  if (
    typeof fingerprint !== 'string' ||
    !fingerprint.trim()
  ) {
    throw new Error(
      'Generated handoff is missing eventFingerprint.',
    )
  }

  return fingerprint.trim()
}

async function findFlashId({
  payload,
  eventFingerprint,
  language,
}: {
  payload:
    Awaited<
      ReturnType<
        typeof createPayload
      >
    >
  eventFingerprint:
    string
  language:
    'ro' | 'en'
}): Promise<number> {
  const result =
    await payload.find({
      collection:
        'flash-ai',
      depth:
        0,
      overrideAccess:
        true,
      draft:
        true,
      limit:
        10,
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

  const docs =
    result.docs.filter(
      doc =>
        doc._status ===
          'draft' &&
        doc.publishedAt ==
          null,
    )

  if (
    docs.length !== 1
  ) {
    throw new Error(
      `Expected exactly one unpublished ${language.toUpperCase()} Flash draft for event fingerprint; found ${String(docs.length)}.`,
    )
  }

  return docs[0]!.id
}

async function main() {
  assertStagingOneShot()

  if (!hasFlag(ALLOW_FLAG)) {
    throw new Error(
      `FLASH-014 requires explicit ${ALLOW_FLAG}.`,
    )
  }

  if (
    !hasFlag(
      '--allow-provider-requests',
    )
  ) {
    throw new Error(
      'FLASH-014 requires --allow-provider-requests.',
    )
  }

  const model =
    argument('--model')

  if (!model) {
    throw new Error(
      'FLASH-014 requires --model.',
    )
  }

  const sourceIdRaw =
    argument('--source-id')

  const sourceId =
    sourceIdRaw
      ? parsePositiveInteger(
          sourceIdRaw,
          '--source-id',
        )
      : null

  const maxCandidatesRaw =
    argument('--max-candidates')

  const maxCandidates =
    maxCandidatesRaw
      ? Math.min(
          parsePositiveInteger(
            maxCandidatesRaw,
            '--max-candidates',
          ),
          10,
        )
      : 5

  const payload =
    await createPayload()

  const plans =
    (
      await planFlashRssIngestionSources(
        payload,
      )
    )
      .filter(
        plan =>
          plan.ready &&
          plan.allowAutoPublish ===
            false &&
          (
            sourceId === null ||
            plan.sourceId ===
              sourceId
          ),
      )

  if (!plans.length) {
    throw new Error(
      'No RSS-ready ingestion source with allowAutoPublish=false matched FLASH-014.',
    )
  }

  for (const plan of plans) {
    if (!plan.feedUrl) continue

    const xml =
      await fetchFlashRssFeedXml({
        feedUrl:
          plan.feedUrl,
        registeredSourceUrl:
          plan.registeredSourceUrl,
      })

    const parsed =
      await parseFlashRssCandidates(
        plan,
        xml,
        {
          maxItems:
            maxCandidates,
        },
      )

    for (
      const [
        candidateIndex,
        candidate,
      ] of
        parsed.candidates.entries()
    ) {
      const prefix =
        path.join(
          '/tmp',
          `flash-014-${String(plan.sourceId)}-${String(candidateIndex)}`,
        )

      const roFile =
        `${prefix}-ro.json`

      const enFile =
        `${prefix}-en.json`

      await Promise.all([
        rm(
          roFile,
          { force: true },
        ),
        rm(
          enFile,
          { force: true },
        ),
      ])

      console.log(
        'FLASH_014_CANDIDATE_START',
        {
          sourceId:
            plan.sourceId,
          title:
            candidate.title,
          articleUrl:
            candidate.concreteUrl,
        },
      )

      try {
        runTsx([
          'scripts/flash-html-article-prepersistence-dedup-preview.ts',
          '--source-id',
          String(
            plan.sourceId,
          ),
          '--article-url',
          candidate.concreteUrl,
          '--target-language',
          'ro',
          '--require-grounded-event-identity',
          '--allow-provider-requests',
          '--model',
          model,
          '--handoff-output',
          roFile,
        ])

        runTsx([
          'scripts/flash-html-article-prepersistence-dedup-preview.ts',
          '--source-id',
          String(
            plan.sourceId,
          ),
          '--article-url',
          candidate.concreteUrl,
          '--target-language',
          'en',
          '--require-grounded-event-identity',
          '--allow-provider-requests',
          '--model',
          model,
          '--handoff-output',
          enFile,
        ])
      } catch (error) {
        console.log(
          'FLASH_014_CANDIDATE_SKIPPED',
          {
            sourceId:
              plan.sourceId,
            articleUrl:
              candidate.concreteUrl,
            reason:
              error instanceof Error
                ? error.message.slice(
                    0,
                    1200,
                  )
                : String(error),
          },
        )
        continue
      }

      const [
        roFingerprint,
        enFingerprint,
      ] =
        await Promise.all([
          readEventFingerprint(
            roFile,
          ),
          readEventFingerprint(
            enFile,
          ),
        ])

      if (
        roFingerprint !==
        enFingerprint
      ) {
        throw new Error(
          'RO and EN handoffs do not share the same eventFingerprint.',
        )
      }

      runTsx([
        'scripts/flash-ai-staging-write-once.ts',
        '--input-file',
        roFile,
        '--allow-staging-flash-ai-write',
      ])

      runTsx([
        'scripts/flash-ai-staging-write-once.ts',
        '--input-file',
        enFile,
        '--allow-staging-flash-ai-write',
      ])

      const [
        roId,
        enId,
      ] =
        await Promise.all([
          findFlashId({
            payload,
            eventFingerprint:
              roFingerprint,
            language:
              'ro',
          }),
          findFlashId({
            payload,
            eventFingerprint:
              enFingerprint,
            language:
              'en',
          }),
        ])

      runTsx([
        'scripts/flash-ai-staging-link-alternatives.ts',
        '--pairs',
        `${String(roId)}:${String(enId)}`,
        '--allow-staging-flash-ai-link-alternatives',
      ])

      runTsx([
        'scripts/flash-ai-staging-mark-review.ts',
        '--ids',
        `${String(roId)},${String(enId)}`,
        '--allow-staging-flash-ai-review-transition',
      ])

      console.log(
        'FLASH_014_NEXT_DRAFT_OK',
        {
          sourceId:
            plan.sourceId,
          sourceName:
            plan.sourceName,
          articleUrl:
            candidate.concreteUrl,
          eventFingerprint:
            roFingerprint,
          roId,
          enId,
          status:
            'review',
          published:
            false,
          autoPublish:
            false,
        },
      )

      return
    }
  }

  console.log(
    'FLASH_014_NEXT_DRAFT_EMPTY',
    {
      sourceId,
      maxCandidates,
      created:
        false,
    },
  )
}

main()
  .then(
    () => process.exit(0),
  )
  .catch(
    error => {
      console.error(
        'FLASH_014_NEXT_DRAFT_FAILED',
      )
      console.error(
        error instanceof Error
          ? error.message
          : error,
      )
      process.exit(1)
    },
  )
