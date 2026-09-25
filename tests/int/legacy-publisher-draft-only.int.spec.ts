import {
  readFileSync,
} from 'node:fs'
import {
  resolve,
} from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const publishers = [
  'publish-rss.ts',
  'publish-health.ts',
  'publish-education.ts',
  'publish-business.ts',
] as const

function readPublisher(
  filename:
    (typeof publishers)[number],
): string {
  return readFileSync(
    resolve(
      process.cwd(),
      filename,
    ),
    'utf8',
  )
}

describe(
  'PUB-001 legacy publisher containment contract',
  () => {
    for (
      const filename
      of publishers
    ) {
      it(
        `${filename} writes review drafts and never publishes directly`,
        () => {
          const source =
            readPublisher(
              filename,
            )

          expect(
            source,
          ).not.toMatch(
            /status:\s*['"]published['"]/,
          )

          expect(
            source,
          ).not.toContain(
            'publishedAt:',
          )

          expect(
            source.match(
              /draft:\s*true/g,
            )?.length ?? 0,
          ).toBeGreaterThanOrEqual(
            3,
          )

          expect(
            source.match(
              /editorialStatus:\s*['"]review['"]/g,
            )?.length ?? 0,
          ).toBe(
            2,
          )

          expect(
            source,
          ).not.toMatch(
            /status:\s*['"]draft['"]/,
          )
        },
      )

      it(
        `${filename} keeps reciprocal language linking inside draft semantics`,
        () => {
          const source =
            readPublisher(
              filename,
            )

          expect(
            source,
          ).toMatch(
            /payload\.update\(\{\s*collection:\s*['"]articole['"],\s*id:\s*creat\.id,\s*draft:\s*true,/s,
          )
        },
      )
    }
  },
)
