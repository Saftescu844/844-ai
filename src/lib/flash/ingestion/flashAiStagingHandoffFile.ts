import {
  writeFile,
} from 'node:fs/promises'

import type {
  FlashNormalizedArticleCandidate,
} from './articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from './articleCandidatePersistenceReadiness'

import {
  buildFlashAiStagingHandoffArtifact,
} from './flashAiStagingHandoffArtifact'

export async function writeFlashAiStagingHandoffArtifactOnce({
  outputPath,
  candidate,
  readiness,
}: {
  outputPath: string

  candidate:
    FlashNormalizedArticleCandidate

  readiness:
    FlashArticlePersistenceReadiness
}): Promise<void> {
  const artifact =
    buildFlashAiStagingHandoffArtifact({
      candidate,
      readiness,
    })

  const serialized =
    `${JSON.stringify(
      artifact,
      null,
      2,
    )}\n`

  await writeFile(
    outputPath,
    serialized,
    {
      encoding:
        'utf8',

      flag:
        'wx',
    },
  )
}
