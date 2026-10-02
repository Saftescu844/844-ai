import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashFactualSourceDocument,
} from '@/lib/flash/semanticEvidence/factualSourceCorpus'

import {
  buildFlashFactualSourceChunks,
} from '@/lib/flash/semanticEvidence/factualSourceChunks'

function sourceDocument({
  citationId =
    'row-1',
  contentType =
    'text/plain',
  textContent =
    'Primul paragraf.\nAl doilea paragraf.',
}: {
  citationId?:
    string

  contentType?:
    string | null

  textContent?:
    string
} = {}):
  FlashFactualSourceDocument {
  return {
    citationId,

    rowIndex:
      0,

    rowId:
      'row-1',

    sourceId:
      10,

    registeredSourceUrl:
      'https://example.com',

    concreteUrl:
      'https://example.com/article',

    finalUrl:
      'https://example.com/article',

    contentType,

    textContent,
  }
}

describe(
  'Flash factual source chunks',
  () => {
    it(
      'builds deterministic chunks with code-owned evidence references',
      () => {
        const document =
          sourceDocument()

        const first =
          buildFlashFactualSourceChunks(
            document,
            {
              maxChars:
                20,
            },
          )

        const second =
          buildFlashFactualSourceChunks(
            document,
            {
              maxChars:
                20,
            },
          )

        expect(
          first,
        ).toEqual(
          second,
        )

        expect(
          first.chunks,
        ).toHaveLength(
          2,
        )

        expect(
          first.chunks[0],
        ).toMatchObject({
          citationId:
            'row-1',

          chunkIndex:
            0,

          evidenceText:
            'Primul paragraf.',
        })

        expect(
          first.chunks[0]
            ?.chunkId,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        )

        expect(
          first.chunks[0]
            ?.evidenceRef,
        ).toMatch(
          /^row-1:chunk:0:[a-f0-9]{16}$/,
        )
      },
    )

    it(
      'normalizes HTML before generating chunk identities',
      () => {
        const result =
          buildFlashFactualSourceChunks(
            sourceDocument({
              contentType:
                'text/html',

              textContent: `
                <html>
                  <body>
                    <header>Noise</header>

                    <main>
                      <h1>Studiu</h1>
                      <p>Rezultat factual.</p>

                      <script>
                        volatile()
                      </script>
                    </main>
                  </body>
                </html>
              `,
            }),
          )

        expect(
          result.normalizationMethod,
        ).toBe(
          'html_dom',
        )

        expect(
          result.normalizedText,
        ).toBe(
          'Studiu\nRezultat factual.',
        )

        expect(
          result.chunks,
        ).toHaveLength(
          1,
        )

        expect(
          result.chunks[0]
            ?.evidenceText,
        ).toBe(
          'Studiu\nRezultat factual.',
        )
      },
    )

    it(
      'packs adjacent normalized blocks while the maximum size allows it',
      () => {
        const result =
          buildFlashFactualSourceChunks(
            sourceDocument({
              textContent:
                'Alpha.\nBeta.\nGamma.',
            }),
            {
              maxChars:
                13,
            },
          )

        expect(
          result.chunks.map(
            chunk =>
              chunk.evidenceText,
          ),
        ).toEqual([
          'Alpha.\nBeta.',
          'Gamma.',
        ])
      },
    )

    it(
      'splits an oversized block only on whitespace',
      () => {
        const result =
          buildFlashFactualSourceChunks(
            sourceDocument({
              textContent:
                'unu doi trei patru cinci',
            }),
            {
              maxChars:
                10,
            },
          )

        expect(
          result.chunks.map(
            chunk =>
              chunk.evidenceText,
          ),
        ).toEqual([
          'unu doi',
          'trei patru',
          'cinci',
        ])

        expect(
          result.chunks
            .flatMap(
              chunk =>
                chunk.evidenceText
                  .split(
                    /\s+/,
                  ),
            ),
        ).toEqual([
          'unu',
          'doi',
          'trei',
          'patru',
          'cinci',
        ])
      },
    )

    it(
      'does not truncate an individual token longer than maxChars',
      () => {
        const longToken =
          'https://example.com/' +
          'a'.repeat(
            50,
          )

        const result =
          buildFlashFactualSourceChunks(
            sourceDocument({
              textContent:
                longToken,
            }),
            {
              maxChars:
                10,
            },
          )

        expect(
          result.chunks,
        ).toHaveLength(
          1,
        )

        expect(
          result.chunks[0]
            ?.evidenceText,
        ).toBe(
          longToken,
        )
      },
    )

    it(
      'changes chunk identity when factual text changes',
      () => {
        const first =
          buildFlashFactualSourceChunks(
            sourceDocument({
              textContent:
                'Rezultatul este pozitiv.',
            }),
          )

        const second =
          buildFlashFactualSourceChunks(
            sourceDocument({
              textContent:
                'Rezultatul este negativ.',
            }),
          )

        expect(
          first.chunks[0]
            ?.chunkId,
        ).not.toBe(
          second.chunks[0]
            ?.chunkId,
        )

        expect(
          first.chunks[0]
            ?.evidenceRef,
        ).not.toBe(
          second.chunks[0]
            ?.evidenceRef,
        )
      },
    )

    it(
      'changes chunk identity when citation identity changes',
      () => {
        const first =
          buildFlashFactualSourceChunks(
            sourceDocument({
              citationId:
                'row-1',
            }),
          )

        const second =
          buildFlashFactualSourceChunks(
            sourceDocument({
              citationId:
                'row-2',
            }),
          )

        expect(
          first.chunks[0]
            ?.chunkId,
        ).not.toBe(
          second.chunks[0]
            ?.chunkId,
        )
      },
    )

    it(
      'returns no chunks for normalized empty content',
      () => {
        const result =
          buildFlashFactualSourceChunks(
            sourceDocument({
              textContent:
                '   \n\n ',
            }),
          )

        expect(
          result.normalizedText,
        ).toBe(
          '',
        )

        expect(
          result.chunks,
        ).toEqual([])
      },
    )

    it(
      'rejects invalid maximum chunk sizes',
      () => {
        expect(
          () =>
            buildFlashFactualSourceChunks(
              sourceDocument(),
              {
                maxChars:
                  0,
              },
            ),
        ).toThrow(
          'Flash factual source maxChars must be a positive integer',
        )

        expect(
          () =>
            buildFlashFactualSourceChunks(
              sourceDocument(),
              {
                maxChars:
                  12.5,
              },
            ),
        ).toThrow(
          'Flash factual source maxChars must be a positive integer',
        )
      },
    )
  },
)
