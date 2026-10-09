import {
  readFile,
} from 'node:fs/promises'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

describe(
  'Education Flash AI feed',
  () => {
    it(
      'includes published Education Flash AI in all submenus by editorial classification',
      async () => {
        const payloadSource =
          await readFile(
            path.resolve(
              process.cwd(),
              'src/lib/payload.ts',
            ),
            'utf8',
          )

        expect(
          payloadSource,
        ).toContain(
          'export async function getFlashAiEducatie',
        )

        expect(
          payloadSource,
        ).toContain(
          "{ 'pilon.slug': { equals: 'educatie' } }",
        )

        expect(
          payloadSource,
        ).toContain(
          "{ subcategorieEducatie: { equals: subcategorie } }",
        )

        expect(
          payloadSource,
        ).not.toContain(
          "subcategorie !== 'cercetare'",
        )
      },
    )

    it(
      'renders Article and Flash cards together in the Education section',
      async () => {
        const pageSource =
          await readFile(
            path.resolve(
              process.cwd(),
              'src/app/(frontend)/[lang]/pilon/[pilon]/page.tsx',
            ),
            'utf8',
          )

        expect(
          pageSource,
        ).toContain(
          'getFlashAiEducatie(lang, sub)',
        )

        expect(
          pageSource,
        ).toContain(
          "...flashuri.map((item: any) => ({",
        )

        expect(
          pageSource,
        ).toContain(
          "? <CardFlash",
        )

        expect(
          pageSource,
        ).toContain(
          'timestamp(b.item.publishedAt)',
        )
      },
    )
  },
)
