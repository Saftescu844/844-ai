import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

describe(
  'pillar SEO metadata',
  () => {
    it(
      'defines localized title, description, canonical and hreflang for every public pillar',
      async () => {
        const source =
          await readFile(
            path.resolve(
              process.cwd(),
              'src/app/(frontend)/[lang]/pilon/[pilon]/page.tsx',
            ),
            'utf8',
          )

        expect(source).toContain(
          'export async function generateMetadata',
        )

        expect(source).toContain(
          "canonical: \`/\${lang}/pilon/\${pilon}\`",
        )

        expect(source).toContain(
          "ro: \`/ro/pilon/\${pilon}\`",
        )

        expect(source).toContain(
          "en: \`/en/pilon/\${pilon}\`",
        )

        for (const title of [
          'Știri AI și noutăți despre inteligența artificială',
          'AI în sănătate și medicină',
          'AI în educație, învățare și cercetare',
          'Tool Directory: instrumente și aplicații AI',
          'AI pentru afaceri și productivitate',
          'AI News and Artificial Intelligence Updates',
          'AI in Health and Medicine',
          'AI in Education, Learning and Research',
          'Tool Directory: AI Tools and Applications',
          'AI for Business and Productivity',
        ]) {
          expect(source).toContain(
            title,
          )
        }
      },
    )
  },
)
