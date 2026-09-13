import {
  execFile,
} from 'node:child_process'
import {
  readFile,
} from 'node:fs/promises'
import {
  resolve,
} from 'node:path'
import {
  promisify,
} from 'node:util'

import {
  describe,
  expect,
  it,
} from 'vitest'

const execFileAsync =
  promisify(
    execFile,
  )

const scriptPath =
  resolve(
    process.cwd(),
    'scripts/flash-html-article-preview.ts',
  )

describe(
  'Flash HTML article preview CLI',
  () => {
    it(
      'documents a controlled read-only article preview with no write path',
      async () => {
        const source =
          await readFile(
            scriptPath,
            'utf8',
          )

        expect(
          source,
        ).toContain(
          'FLASH_HTML_ARTICLE_PREVIEW_OK',
        )

        expect(
          source,
        ).toContain(
          'retrieveFlashSource',
        )

        expect(
          source,
        ).toContain(
          'extractFlashHtmlArticle',
        )

        expect(
          source,
        ).toContain(
          'PAYLOAD_DB_PUSH',
        )

        expect(
          source,
        ).not.toMatch(
          /payload\.(create|update|delete)\s*\(/,
        )

        expect(
          source,
        ).not.toMatch(
          /payload\.jobs\.(queue|run)\s*\(/,
        )

        expect(
          source,
        ).not.toContain(
          'Anthropic',
        )
      },
    )

    it(
      'prints help before requiring Railway or Payload environment',
      async () => {
        const {
          stdout,
          stderr,
        } =
          await execFileAsync(
            process.execPath,
            [
              '--import',
              'tsx',
              'scripts/flash-html-article-preview.ts',
              '--help',
            ],
            {
              cwd:
                process.cwd(),
              env: {
                ...process.env,
                RAILWAY_PROJECT_ID:
                  '',
                RAILWAY_ENVIRONMENT_ID:
                  '',
                RAILWAY_SERVICE_ID:
                  '',
                PAYLOAD_DB_PUSH:
                  '',
              },
            },
          )

        expect(
          stderr,
        ).toBe(
          '',
        )

        expect(
          stdout,
        ).toContain(
          'Flash Engine HTML article preview',
        )

        expect(
          stdout,
        ).toContain(
          'does NOT create or update FlashAI',
        )
      },
    )
  },
)
