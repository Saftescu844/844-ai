import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  FLASH_SUPPORTING_POLICY_MAX_TEXT_CHARS,
  extractFlashSupportingPolicySemanticMaterial,
} from '@/lib/flash/ingestion/supportingPolicySemanticMaterial'

import type {
  FlashVerifiedSupportingSource,
} from '@/lib/flash/ingestion/verifiedSupportingSourcePack'

function source(
  html: string,
  overrides: Partial<
    FlashVerifiedSupportingSource
  > = {},
): FlashVerifiedSupportingSource {
  return {
    id: 'supporting-1',
    registeredSourceUrl:
      'https://digital-strategy.ec.europa.eu/',
    concreteUrl:
      'https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice',
    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice',
    textContent:
      html,
    ...overrides,
  }
}

describe(
  'Flash supporting policy semantic material',
  () => {
    it(
      'extracts bounded semantic blocks from main policy content and stops before Related Content',
      () => {
        const result =
          extractFlashSupportingPolicySemanticMaterial(
            source(`
              <html>
                <body>
                  <header>Site chrome</header>
                  <main>
                    <h1>Signatory Taskforce of the General-Purpose AI Code of Practice</h1>
                    <p>The Signatory Taskforce fosters exchanges and compliance.</p>
                    <h2>Objectives of the Taskforce</h2>
                    <p>The taskforce facilitates a coherent application of the code.</p>
                    <h2>Taskforce meetings</h2>
                    <ul>
                      <li>First meeting – 30 January 2026</li>
                      <li>Second meeting – 13 March 2026</li>
                      <li>Third meeting – 27 March 2026</li>
                      <li>Fourth meeting – 17 July 2026</li>
                    </ul>
                    <h2>Related Content</h2>
                    <p>This generic card text must not reach semantic material.</p>
                  </main>
                  <footer>Footer chrome</footer>
                </body>
              </html>
            `),
          )

        expect(result).toMatchObject({
          title:
            'Signatory Taskforce of the General-Purpose AI Code of Practice',
          sourceUrl:
            'https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice',
        })

        expect(
          result.semanticText,
        ).toContain(
          'Fourth meeting – 17 July 2026',
        )

        expect(
          result.semanticText,
        ).not.toContain(
          'This generic card text must not reach semantic material.',
        )

        expect(
          result.semanticText,
        ).not.toContain(
          'Site chrome',
        )

        expect(
          result.semanticText,
        ).not.toContain(
          'Footer chrome',
        )
      },
    )

    it(
      'supports the EC policy layout when the page h1 is outside main content',
      () => {
        const result =
          extractFlashSupportingPolicySemanticMaterial(
            source(`
              <html>
                <body>
                  <header>
                    <h1>Signatory Taskforce of the General-Purpose AI Code of Practice</h1>
                  </header>
                  <main>
                    <p>The Signatory Taskforce fosters exchanges and compliance.</p>
                    <h2>Objectives of the Taskforce</h2>
                    <p>The taskforce facilitates a coherent application of the code.</p>
                    <h2>Related Content</h2>
                  </main>
                </body>
              </html>
            `),
          )

        expect(result.title).toBe(
          'Signatory Taskforce of the General-Purpose AI Code of Practice',
        )

        expect(result.semanticText).toContain(
          'The Signatory Taskforce fosters exchanges and compliance.',
        )

        expect(result.semanticText).toContain(
          'Objectives of the Taskforce',
        )
      },
    )

    it(
      'drops a long list section instead of flooding semantic material with directory-like entries',
      () => {
        const listItems =
          Array.from(
            {
              length: 9,
            },
            (_, index) =>
              `<li>Signatory ${String(index + 1)}</li>`,
          ).join('')

        const result =
          extractFlashSupportingPolicySemanticMaterial(
            source(`
              <main>
                <h1>The General-Purpose AI Code of Practice</h1>
                <p>The code helps industry comply with legal obligations.</p>
                <h2>Signatories of the code of practice</h2>
                <ul>${listItems}</ul>
                <h2>Related Content</h2>
              </main>
            `),
          )

        expect(
          result.semanticText,
        ).toContain(
          'Signatories of the code of practice',
        )

        expect(
          result.semanticText,
        ).not.toContain(
          'Signatory 1',
        )

        expect(
          result.semanticText,
        ).not.toContain(
          'Signatory 9',
        )
      },
    )

    it(
      'removes script style and inline markup while decoding basic entities',
      () => {
        const result =
          extractFlashSupportingPolicySemanticMaterial(
            source(`
              <main>
                <h1>The <em>GPAI</em> Code &amp; Practice</h1>
                <script>invented script content</script>
                <style>.hidden { display: none; }</style>
                <p>Safety&nbsp;and <strong>Security</strong> obligations.</p>
              </main>
            `),
          )

        expect(result.title).toBe(
          'The GPAI Code & Practice',
        )

        expect(result.semanticText).toContain(
          'Safety and Security obligations.',
        )

        expect(result.semanticText).not.toContain(
          'invented script content',
        )
      },
    )

    it(
      'rejects non-policy URLs and pages without a main or h1 semantic root',
      () => {
        expect(
          () =>
            extractFlashSupportingPolicySemanticMaterial(
              source(
                '<main><h1>News</h1><p>Body</p></main>',
                {
                  finalUrl:
                    'https://digital-strategy.ec.europa.eu/en/news/example',
                },
              ),
            ),
        ).toThrow(
          '/en/policies/...',
        )

        expect(
          () =>
            extractFlashSupportingPolicySemanticMaterial(
              source(
                '<div><h1>Policy</h1></div>',
              ),
            ),
        ).toThrow(
          'missing main content',
        )

        expect(
          () =>
            extractFlashSupportingPolicySemanticMaterial(
              source(
                '<main><p>Policy body only.</p></main>',
              ),
            ),
        ).toThrow(
          'missing an h1 title',
        )
      },
    )

    it(
      'caps semantic material at complete block boundaries',
      () => {
        const paragraph =
          `A ${'bounded '.repeat(500)}`

        const result =
          extractFlashSupportingPolicySemanticMaterial(
            source(`
              <main>
                <h1>Policy title</h1>
                <p>${paragraph}</p>
                <p>${paragraph}</p>
                <p>${paragraph}</p>
                <p>${paragraph}</p>
              </main>
            `),
          )

        expect(
          result.textLength,
        ).toBeLessThanOrEqual(
          FLASH_SUPPORTING_POLICY_MAX_TEXT_CHARS,
        )

        expect(
          result.semanticText.match(
            /A bounded/g,
          ) ?? [],
        ).toHaveLength(2)
      },
    )
  },
)
