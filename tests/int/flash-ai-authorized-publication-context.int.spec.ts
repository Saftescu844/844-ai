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
  'FlashAI authorized publication context',
  () => {
    it(
      'keeps the internal exception narrow and preserves the admin publication guard',
      async () => {
        const collectionSource =
          await readFile(
            path.resolve(
              process.cwd(),
              'src/collections/FlashAI.ts',
            ),
            'utf8',
          )

        const publisherSource =
          await readFile(
            path.resolve(
              process.cwd(),
              'src/lib/flash/ingestion/payloadFlashAiStagingPairPublisher.ts',
            ),
            'utf8',
          )

        expect(
          collectionSource,
        ).toContain(
          'authorizedEnginePublication',
        )

        expect(
          collectionSource,
        ).toContain(
          "operation === 'update'",
        )

        expect(
          collectionSource,
        ).toContain(
          "operation === 'updateByID'",
        )

        expect(
          collectionSource,
        ).toContain(
          "args.data?._status === 'published'",
        )

        expect(
          collectionSource,
        ).toContain(
          'isFlashAiAuthorizedPublicationContext',
        )

        expect(
          collectionSource,
        ).toContain(
          'Publicarea Flash este rezervată fluxului autorizat.',
        )

        expect(
          publisherSource.match(
            /FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT/g,
          )?.length,
        ).toBe(
          3,
        )
      },
    )
  },
)
