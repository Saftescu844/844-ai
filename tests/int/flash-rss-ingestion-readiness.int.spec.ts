import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  assessFlashRssIngestionSource,
  filterFlashRssCandidatesWithinDailySourceBudgets,
  parseFlashRssCandidates,
  planFlashRssIngestionSources,
} from '@/lib/flash/ingestion/rssCandidateIngestion'

function source(
  overrides:
    Record<
      string,
      unknown
    > = {},
) {
  return {
    id:
      4,
    nume:
      'Comisia Europeană — AI Act',
    url:
      'https://digital-strategy.ec.europa.eu/',
    feedRSS:
      null,
    sourceRole:
      'primary' as const,
    editorialTrust:
      'high' as const,
    citationMode:
      'paraphrase' as const,
    allowAutoPublish:
      false,
    maxCandidatesPerScan:
      10,
    maxCandidatesPerDay:
      40,
    ...overrides,
  }
}

describe(
  'Flash RSS ingestion readiness',
  () => {
    it(
      'marks an ingestion source without feedRSS as blocked',
      () => {
        expect(
          assessFlashRssIngestionSource(
            source(),
          ),
        ).toEqual({
          sourceId:
            4,
          sourceName:
            'Comisia Europeană — AI Act',
          registeredSourceUrl:
            'https://digital-strategy.ec.europa.eu/',
          feedUrl:
            null,
          sourceRole:
            'primary',
          editorialTrust:
            'high',
          citationMode:
            'paraphrase',
          allowAutoPublish:
            false,
          maxCandidatesPerScan:
            10,
          maxCandidatesPerDay:
            40,
          candidateSkipMemory:
            [],
          ready:
            false,
          blocker:
            'missing_feed_rss',
        })
      },
    )

    it(
      'rejects non-HTTP feed URLs before any network retrieval',
      () => {
        const result =
          assessFlashRssIngestionSource(
            source({
              feedRSS:
                'file:///tmp/feed.xml',
            }),
          )

        expect(
          result.ready,
        ).toBe(
          false,
        )

        expect(
          result.blocker,
        ).toBe(
          'invalid_feed_url',
        )
      },
    )

    it(
      'marks a configured HTTP(S) feed as ready for the later retrieval stage',
      () => {
        const result =
          assessFlashRssIngestionSource(
            source({
              feedRSS:
                ' https://digital-strategy.ec.europa.eu/feed.xml ',
            }),
          )

        expect(
          result.ready,
        ).toBe(
          true,
        )

        expect(
          result.blocker,
        ).toBeNull()

        expect(
          result.feedUrl,
        ).toBe(
          'https://digital-strategy.ec.europa.eu/feed.xml',
        )

        expect(
          result.candidateSkipMemory,
        ).toEqual(
          [],
        )

        expect(
          result.maxCandidatesPerScan,
        ).toBe(
          10,
        )

        expect(
          result.maxCandidatesPerDay,
        ).toBe(
          40,
        )
      },
    )

    it(
      'reads only active allowIngestion sources through Payload',
      async () => {
        const find =
          vi.fn(
            async () => ({
              docs: [
                source(),
              ],
            }),
          )

        const result =
          await planFlashRssIngestionSources(
            {
              find,
            } as never,
          )

        expect(
          find,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          find,
        ).toHaveBeenCalledWith({
          collection:
            'surse',
          depth:
            0,
          overrideAccess:
            true,
          pagination:
            false,
          where: {
            and: [
              {
                activa: {
                  equals:
                    true,
                },
              },
              {
                allowIngestion: {
                  equals:
                    true,
                },
              },
            ],
          },
        })

        expect(
          result,
        ).toHaveLength(
          1,
        )

        expect(
          result[0]?.blocker,
        ).toBe(
          'missing_feed_rss',
        )
      },
    )
  },
)

describe(
  'Flash RSS candidate parser',
  () => {
    const readySource =
      assessFlashRssIngestionSource(
        source({
          feedRSS:
            'https://digital-strategy.ec.europa.eu/feed.xml',
        }),
      )

    it(
      'refuses to parse candidates for a blocked source',
      async () => {
        const blockedSource =
          assessFlashRssIngestionSource(
            source(),
          )

        await expect(
          parseFlashRssCandidates(
            blockedSource,
            '<rss />',
          ),
        ).rejects.toThrow(
          'Flash RSS source is not ready for ingestion.',
        )
      },
    )

    it(
      'parses RSS XML into read-only normalized candidate records',
      async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <title>AI Act updates</title>
              <item>
                <title> Commission publishes AI Act guidance </title>
                <link>https://digital-strategy.ec.europa.eu/en/news/ai-act-guidance</link>
                <pubDate>Thu, 10 Sep 2026 10:00:00 GMT</pubDate>
                <description>Official guidance for providers and deployers.</description>
              </item>
              <item>
                <title>Missing link item</title>
                <description>This item must be skipped.</description>
              </item>
            </channel>
          </rss>`

        const result =
          await parseFlashRssCandidates(
            readySource,
            xml,
          )

        expect(
          result.totalItems,
        ).toBe(
          2,
        )

        expect(
          result.skippedItems,
        ).toBe(
          1,
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
            feedUrl:
              'https://digital-strategy.ec.europa.eu/feed.xml',
            title:
              'Commission publishes AI Act guidance',
            concreteUrl:
              'https://digital-strategy.ec.europa.eu/en/news/ai-act-guidance',
            publishedAt:
              '2026-09-10T10:00:00.000Z',
            summary:
              'Official guidance for providers and deployers.',
          },
        ])
      },
    )

    it(
      'caps parsing at the per-source limit and supports deterministic parser injection',
      async () => {
        const parseFeed =
          vi.fn(
            async () => ({
              items:
                Array.from(
                  {
                    length:
                      60,
                  },
                  (_, index) => ({
                    title:
                      `Item ${index + 1}`,
                    link:
                      `https://digital-strategy.ec.europa.eu/en/news/${index + 1}`,
                  }),
                ),
            }),
          )

        const result =
          await parseFlashRssCandidates(
            readySource,
            '<feed />',
            {
              maxItems:
                100,
              parseFeed,
            },
          )

        expect(
          parseFeed,
        ).toHaveBeenCalledOnce()

        expect(
          result.totalItems,
        ).toBe(
          10,
        )

        expect(
          result.candidates,
        ).toHaveLength(
          10,
        )
      },
    )
  },
)

describe(
  'Flash RSS per-source daily budget',
  () => {
    const nowMs =
      Date.parse(
        '2026-10-24T12:00:00.000Z',
      )

    const plan =
      assessFlashRssIngestionSource(
        source({
          id:
            7,
          feedRSS:
            'https://openai.com/news/rss.xml',
          maxCandidatesPerScan:
            1,
          maxCandidatesPerDay:
            1,
        }),
      )

    const candidate = {
      sourceId:
        7,
      sourceName:
        'OpenAI News',
      sourceRole:
        'primary' as const,
      editorialTrust:
        'high' as const,
      citationMode:
        'paraphrase' as const,
      feedUrl:
        'https://openai.com/news/rss.xml',
      title:
        'A new education update',
      concreteUrl:
        'https://openai.com/news/education-update',
      publishedAt:
        '2026-10-24T11:00:00.000Z',
      summary:
        null,
    }

    it(
      'counts a recent reciprocal RO/EN pair as one candidate and blocks the source at its limit',
      () => {
        const existing =
          [
            'ro',
            'en',
          ].map(
            () => ({
              createdAt:
                '2026-10-24T10:00:00.000Z',
              generatAutomat:
                true,
              surseFlash: [
                {
                  sursa:
                    7,
                  url:
                    'https://openai.com/news/already-created',
                },
              ],
            }),
          )

        const result =
          filterFlashRssCandidatesWithinDailySourceBudgets(
            [
              candidate,
            ],
            [
              plan,
            ],
            existing,
            nowMs,
          )

        expect(
          result,
        ).toEqual({
          candidates:
            [],
          filteredCount:
            1,
        })
      },
    )

    it(
      'ignores manual and expired records so an eligible source remains available',
      () => {
        const result =
          filterFlashRssCandidatesWithinDailySourceBudgets(
            [
              candidate,
            ],
            [
              plan,
            ],
            [
              {
                createdAt:
                  '2026-10-24T11:00:00.000Z',
                generatAutomat:
                  false,
                surseFlash: [
                  {
                    sursa:
                      7,
                    url:
                      'https://openai.com/news/manual',
                  },
                ],
              },
              {
                createdAt:
                  '2026-10-23T11:59:59.000Z',
                generatAutomat:
                  true,
                surseFlash: [
                  {
                    sursa:
                      7,
                    url:
                      'https://openai.com/news/expired',
                  },
                ],
              },
            ],
            nowMs,
          )

        expect(
          result,
        ).toEqual({
          candidates: [
            candidate,
          ],
          filteredCount:
            0,
        })
      },
    )
  },
)
