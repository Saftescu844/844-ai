import {
  readFile,
} from 'node:fs/promises'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

describe('public search page', () => {
  it('accepts article and Flash result URLs and labels Flash results', async () => {
    const source =
      await readFile(
        path.resolve(
          process.cwd(),
          'src/app/(frontend)/[lang]/search/page.tsx',
        ),
        'utf8',
      )

    expect(source).toContain(
      `/\${lang}/articol/`,
    )

    expect(source).toContain(
      `/\${lang}/flash/`,
    )

    expect(source).toContain(
      "doc.kind === 'flash'",
    )

    expect(source).toContain(
      'flashTypeLabel',
    )
  })
})
