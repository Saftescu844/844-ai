import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  normalizeFlashFactualSourceText,
} from '@/lib/flash/semanticEvidence/factualSourceTextNormalization'

describe(
  'Flash factual source text normalization',
  () => {
    it(
      'extracts deterministic editorial text from HTML and removes executable or decorative markup',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'text/html; charset=utf-8',

            textContent: `
              <!doctype html>
              <html>
                <head>
                  <style>.x { color: red }</style>
                  <script>window.secret = "noise"</script>
                </head>
                <body>
                  <header>Site header</header>

                  <main>
                    <h1>Studiu nou</h1>

                    <p>
                      Rezultatul principal
                      este pozitiv.
                    </p>

                    <script>
                      analytics("volatile");
                    </script>

                    <svg>
                      <text>Decorative chart label</text>
                    </svg>

                    <p>A doua concluzie.</p>
                  </main>

                  <footer>Site footer</footer>
                </body>
              </html>
            `,
          })

        expect(
          result,
        ).toEqual({
          method:
            'html_dom',

          text:
            [
              'Studiu nou',
              'Rezultatul principal este pozitiv.',
              'A doua concluzie.',
            ].join(
              '\n',
            ),
        })
      },
    )

    it(
      'prefers main over unrelated body chrome',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'text/html',

            textContent: `
              <body>
                <div>Cookie banner</div>

                <main>
                  <p>Conținut factual.</p>
                </main>

                <div>Related links</div>
              </body>
            `,
          })

        expect(
          result.text,
        ).toBe(
          'Conținut factual.',
        )
      },
    )

    it(
      'uses article when main is absent',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'application/xhtml+xml',

            textContent: `
              <html>
                <body>
                  <nav>Navigație</nav>

                  <article>
                    <h1>Titlu</h1>
                    <p>Text articol.</p>
                  </article>
                </body>
              </html>
            `,
          })

        expect(
          result,
        ).toEqual({
          method:
            'html_dom',

          text:
            'Titlu\nText articol.',
        })
      },
    )

    it(
      'falls back to body when semantic content containers are absent',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'text/html',

            textContent: `
              <html>
                <body>
                  <h1>Titlu simplu</h1>
                  <p>Corp articol.</p>
                </body>
              </html>
            `,
          })

        expect(
          result.text,
        ).toBe(
          'Titlu simplu\nCorp articol.',
        )
      },
    )

    it(
      'extracts text from RSS or XML content',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'application/rss+xml',

            textContent: `
              <?xml version="1.0"?>
              <rss>
                <channel>
                  <title>Feed AI</title>

                  <item>
                    <title>Studiu publicat</title>
                    <description>Rezultat confirmat.</description>
                  </item>
                </channel>
              </rss>
            `,
          })

        expect(
          result.method,
        ).toBe(
          'xml_dom',
        )

        expect(
          result.text,
        ).toContain(
          'Feed AI',
        )

        expect(
          result.text,
        ).toContain(
          'Studiu publicat',
        )

        expect(
          result.text,
        ).toContain(
          'Rezultat confirmat.',
        )
      },
    )

    it(
      'normalizes plain text without interpreting markup-like characters',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'text/plain; charset=utf-8',

            textContent:
              '  A   B\r\n\r\n\r\n C < D  ',
          })

        expect(
          result,
        ).toEqual({
          method:
            'plain_text',

          text:
            'A B\n\nC < D',
        })
      },
    )

    it(
      'falls back conservatively when XML is malformed',
      () => {
        const result =
          normalizeFlashFactualSourceText({
            contentType:
              'application/xml',

            textContent:
              ' <root><item>Text ',
          })

        expect(
          result.method,
        ).toBe(
          'plain_text',
        )

        expect(
          result.text,
        ).toBe(
          '<root><item>Text',
        )
      },
    )

    it(
      'is deterministic for identical input',
      () => {
        const input = {
          contentType:
            'text/html',

          textContent:
            '<main><p>Același text.</p></main>',
        }

        expect(
          normalizeFlashFactualSourceText(
            input,
          ),
        ).toEqual(
          normalizeFlashFactualSourceText(
            input,
          ),
        )
      },
    )
  },
)
