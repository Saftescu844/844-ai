import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  extractFlashHtmlArticle,
} from '@/lib/flash/ingestion/htmlArticleExtraction'

const registeredSourceUrl =
  'https://digital-strategy.ec.europa.eu/'

const articleUrl =
  'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting'

const articleHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1 class="ecl-page-header__title">
      <span>Fourth GPAI Signatory Taskforce meeting</span>
    </h1>

    <ul class="ecl-page-header__meta">
      <li class="ecl-page-header__meta-item">NEWS ARTICLE</li>
      <li class="ecl-page-header__meta-item">Publication 03 August 2026</li>
    </ul>

    <p class="ecl-page-header-standardised__description">
      The fourth meeting of the Signatory Taskforce under the General-Purpose AI (GPAI) Code of Practice focused on the Safety and Security Chapter and the Copyright Chapter.
    </p>

    <div class="cnt-main-body ecl-u-type-m">
      <div class="ecl">
        <p>
          On 17 July 2026, the
          <a href="https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice">GPAI Signatory Taskforce</a>
          covered topics related to the Safety and Security chapter and the Copyright chapter.
        </p>
        <p>
          Regarding the <strong>Safety and Security Chapter</strong>, the AI Office presented an overview of post-market monitoring.
        </p>
        <p>
          The meeting concluded with a short discussion.&nbsp;
        </p>
      </div>
    </div>

    <div class="cnt-aside ecl-u-type-m">
      <aside>
        <h3>Related topics</h3>
        <a href="/en/related-content?topic=119">Artificial intelligence</a>
      </aside>
    </div>
  </body>
</html>
`

describe(
  'Flash HTML article extraction',
  () => {
    it(
      'extracts the controlled EC news article fields and excludes aside content',
      () => {
        const result =
          extractFlashHtmlArticle(
            registeredSourceUrl,
            `${articleUrl}#main-content`,
            articleHtml,
          )

        expect(
          result,
        ).toEqual({
          finalUrl:
            articleUrl,
          title:
            'Fourth GPAI Signatory Taskforce meeting',
          contentType:
            'NEWS ARTICLE',
          publicationDate:
            '03 August 2026',
          lead:
            'The fourth meeting of the Signatory Taskforce under the General-Purpose AI (GPAI) Code of Practice focused on the Safety and Security Chapter and the Copyright Chapter.',
          bodyParagraphs: [
            'On 17 July 2026, the GPAI Signatory Taskforce covered topics related to the Safety and Security chapter and the Copyright chapter.',
            'Regarding the Safety and Security Chapter, the AI Office presented an overview of post-market monitoring.',
            'The meeting concluded with a short discussion.',
          ],
          bodyText: [
            'On 17 July 2026, the GPAI Signatory Taskforce covered topics related to the Safety and Security chapter and the Copyright chapter.',
            'Regarding the Safety and Security Chapter, the AI Office presented an overview of post-market monitoring.',
            'The meeting concluded with a short discussion.',
          ].join(
            '\n\n',
          ),
        })

        expect(
          result.bodyText,
        ).not.toContain(
          'Related topics',
        )
      },
    )

    it(
      'rejects an article outside the registered source host',
      () => {
        expect(
          () =>
            extractFlashHtmlArticle(
              registeredSourceUrl,
              'https://example.com/en/news/test',
              articleHtml,
            ),
        ).toThrow(
          'Flash HTML article must belong to the registered source host.',
        )
      },
    )

    it(
      'rejects a same-host page outside /en/news/...',
      () => {
        expect(
          () =>
            extractFlashHtmlArticle(
              registeredSourceUrl,
              'https://digital-strategy.ec.europa.eu/en/events/test',
              articleHtml,
            ),
        ).toThrow(
          'Flash HTML article URL must be an /en/news/... page.',
        )
      },
    )

    it(
      'fails closed when the main editorial body is missing',
      () => {
        const withoutBody =
          articleHtml.replace(
            /<div class="cnt-main-body[\s\S]*?<div class="cnt-aside/,
            '<div class="cnt-aside',
          )

        expect(
          () =>
            extractFlashHtmlArticle(
              registeredSourceUrl,
              articleUrl,
              withoutBody,
            ),
        ).toThrow(
          'Flash HTML article is missing main body.',
        )
      },
    )
  },
)
