import {
  spawnSync,
} from 'node:child_process'

import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  parseFlashHtmlListingCandidates,
} from '@/lib/flash/ingestion/htmlListingCandidateIngestion'

const script =
  'scripts/flash-html-listing-preview.ts'

const CLI_TEST_TIMEOUT_MS =
  15_000

const source = {
  sourceId:
    4,
  sourceName:
    'Comisia Europeană — AI Act',
  registeredSourceUrl:
    'https://digital-strategy.ec.europa.eu/',
  sourceRole:
    'primary' as const,
  editorialTrust:
    'high' as const,
  citationMode:
    'paraphrase' as const,
  allowAutoPublish:
    false,
}

function runCli(
  args:
    string[],
  extraEnvironment:
    Record<
      string,
      string
    > = {},
) {
  const env = {
    ...process.env,
    ...extraEnvironment,
  }

  delete env.DATABASE_URL
  delete env.ANTHROPIC_API_KEY

  return spawnSync(
    process.execPath,
    [
      '--import=tsx/esm',
      script,
      ...args,
    ],
    {
      cwd:
        process.cwd(),
      env,
      encoding:
        'utf8',
      timeout:
        CLI_TEST_TIMEOUT_MS,
    },
  )
}

function output(
  result:
    ReturnType<
      typeof runCli
    >,
): string {
  return [
    result.stdout,
    result.stderr,
  ].join(
    '\n',
  )
}

describe(
  'Flash HTML listing candidate parser',
  () => {
    it(
      'extracts only same-host /en/news/... links and normalizes titles',
      () => {
        const html = `
          <a href="/en/news/commission-starts-enforcing-ai-act-rules">
            <span>Commission starts enforcing</span> AI Act &amp; rules
          </a>
          <a href="https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting">
            Fourth GPAI Signatory Taskforce meeting
          </a>
          <a href="/en/events/example-event">Event</a>
          <a href="/en/funding/example-call">Funding</a>
          <a href="https://example.com/en/news/not-official">External news</a>
        `

        const result =
          parseFlashHtmlListingCandidates(
            source,
            'https://digital-strategy.ec.europa.eu/en/related-content?topic=119',
            html,
          )

        expect(
          result.candidates,
        ).toEqual([
          {
            sourceId:
              4,
            sourceName:
              'Comisia Europeană — AI Act',
            sourceRole:
              'primary',
            editorialTrust:
              'high',
            citationMode:
              'paraphrase',
            listingUrl:
              'https://digital-strategy.ec.europa.eu/en/related-content?topic=119',
            title:
              'Commission starts enforcing AI Act & rules',
            concreteUrl:
              'https://digital-strategy.ec.europa.eu/en/news/commission-starts-enforcing-ai-act-rules',
          },
          {
            sourceId:
              4,
            sourceName:
              'Comisia Europeană — AI Act',
            sourceRole:
              'primary',
            editorialTrust:
              'high',
            citationMode:
              'paraphrase',
            listingUrl:
              'https://digital-strategy.ec.europa.eu/en/related-content?topic=119',
            title:
              'Fourth GPAI Signatory Taskforce meeting',
            concreteUrl:
              'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
          },
        ])
      },
    )

    it(
      'deduplicates article URLs and respects the requested candidate limit',
      () => {
        const html = `
          <a href="/en/news/one">One</a>
          <a href="/en/news/one?utm_source=test">Duplicate one</a>
          <a href="/en/news/two">Two</a>
          <a href="/en/news/three">Three</a>
        `

        const result =
          parseFlashHtmlListingCandidates(
            source,
            'https://digital-strategy.ec.europa.eu/en/related-content?topic=119',
            html,
            {
              maxItems:
                2,
            },
          )

        expect(
          result.candidates.map(
            candidate =>
              candidate.concreteUrl,
          ),
        ).toEqual([
          'https://digital-strategy.ec.europa.eu/en/news/one',
          'https://digital-strategy.ec.europa.eu/en/news/two',
        ])
      },
    )

    it(
      'rejects a listing URL on another host',
      () => {
        expect(
          () =>
            parseFlashHtmlListingCandidates(
              source,
              'https://example.com/en/related-content?topic=119',
              '<a href="/en/news/one">One</a>',
            ),
        ).toThrow(
          'Flash HTML listing must belong to the registered source host.',
        )
      },
    )
  },
)

describe(
  'Flash HTML listing preview CLI guards',
  () => {
    it(
      'prints help without Payload or database access',
      () => {
        const result =
          runCli([
            '--help',
          ])

        expect(
          result.status,
        ).toBe(
          0,
        )

        const combined =
          output(
            result,
          )

        expect(
          combined,
        ).toContain(
          'Flash Engine HTML listing preview',
        )

        expect(
          combined,
        ).toContain(
          'does NOT call Anthropic',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )

    it(
      'rejects execution outside the configured Railway STAGING target before Payload initialization',
      () => {
        const result =
          runCli([
            '--source-id',
            '4',
            '--listing-url',
            'https://digital-strategy.ec.europa.eu/en/related-content?topic=119',
          ])

        expect(
          result.status,
        ).toBe(
          1,
        )

        const combined =
          output(
            result,
          )

        expect(
          combined,
        ).toContain(
          'Flash HTML listing preview is restricted to the configured read-only STAGING target.',
        )

        expect(
          combined,
        ).not.toContain(
          'FLASH_HTML_LISTING_PREVIEW_OK',
        )
      },
      CLI_TEST_TIMEOUT_MS,
    )
  },
)
