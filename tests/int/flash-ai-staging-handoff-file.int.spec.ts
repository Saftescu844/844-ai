import {
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises'

import {
  tmpdir,
} from 'node:os'

import {
  join,
} from 'node:path'

import {
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'

import type {
  FlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'

import {
  buildVerifiedFlashEditorialLexicalContent,
} from '@/lib/flash/editorialContentLexical'

import {
  writeFlashAiStagingHandoffArtifactOnce,
} from '@/lib/flash/ingestion/flashAiStagingHandoffFile'

function fixture() {
  const canonicalUrl =
    'https://example.com/en/news/grounded-event'

  const candidate = {
    sourceId:
      4,

    canonicalUrl,

    sourcePublicationDate:
      '2026-09-17',
  } as FlashNormalizedArticleCandidate

  const readiness = {
    canCreateFlashAiDraft:
      true,

    verifiedEditorial: {
      editorialTitle:
        'Titlu editorial verificat',

      lexicalContent:
        buildVerifiedFlashEditorialLexicalContent([
          'Conținut editorial verificat pentru handoff-ul STAGING.',
        ]),
    },

    sourceGroundedValues: {
      sourceId:
        4,

      sourceName:
        'Comisia Europeană',

      language:
        'en',

      sourceTitle:
        'Original English title',

      canonicalUrl,

      sourcePublishedAt:
        '2026-09-17',

      sourceFingerprint:
        'source-fingerprint',

      eventFingerprint:
        'event-fingerprint',
    },

    classification: {
      pilonId:
        1,

      flashType:
        'regulation',

      informationStatus:
        'official',

      riskLevel:
        'medium',

      isHealthRelated:
        false,
    },

    draftControls: {
      editorialStatus:
        'draft',

      automationDecision:
        'review',

      payloadStatus:
        'draft',
    },

    deferredDecisions:
      [],

    blockers:
      [],

    reviewSignals:
      [],

    evidence: {
      sourceVerificationPassed:
        true,

      sourceDuplicateFound:
        false,

      eventFingerprintDuplicateFound:
        false,

      sourceFingerprintReviewSignal:
        false,

      titleReviewSignal:
        false,

      finalDedupPending:
        false,

      classificationAvailable:
        true,
    },
  } as FlashArticlePersistenceReadiness

  return {
    candidate,
    readiness,
  }
}

it(
  'writes one projection-free handoff artifact and refuses overwrite',
  async () => {
    const directory =
      await mkdtemp(
        join(
          tmpdir(),
          'flash-ai-handoff-',
        ),
      )

    const outputPath =
      join(
        directory,
        'handoff.json',
      )

    try {
      const {
        candidate,
        readiness,
      } = fixture()

      await writeFlashAiStagingHandoffArtifactOnce({
        outputPath,
        candidate,
        readiness,
      })

      const raw =
        await readFile(
          outputPath,
          'utf8',
        )

      const parsed =
        JSON.parse(
          raw,
        ) as Record<string, unknown>

      expect(
        parsed.candidate,
      ).toBeDefined()

      expect(
        parsed.readiness,
      ).toBeDefined()

      expect(
        Object.prototype.hasOwnProperty.call(
          parsed,
          'projection',
        ),
      ).toBe(
        false,
      )

      await expect(
        writeFlashAiStagingHandoffArtifactOnce({
          outputPath,
          candidate,
          readiness,
        }),
      ).rejects.toMatchObject({
        code:
          'EEXIST',
      })
    } finally {
      await rm(
        directory,
        {
          recursive:
            true,

          force:
            true,
        },
      )
    }
  },
)
