import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  evaluateFlashPrePersistenceEditorialQualityGate,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityGate'

function words(
  count: number,
  prefix: string,
): string {
  return Array.from(
    {
      length: count,
    },
    (_, index) =>
      `${prefix}${String(index + 1)}`,
  ).join(' ')
}

function editorial(
  paragraphs: string[],
): FlashPrePersistenceEditorialGenerationSemanticOutput {
  return {
    language: 'ro',
    editorialTitle:
      'Titlu editorial de test',
    editorialParagraphs:
      paragraphs,
  }
}

describe(
  'Flash pre-persistence editorial quality gate',
  () => {
    it(
      'accepts a structurally clean editorial inside the canonical word-count range',
      () => {
        const result =
          evaluateFlashPrePersistenceEditorialQualityGate(
            editorial([
              words(
                500,
                'cuvant',
              ),
            ]),
          )

        expect(result).toEqual({
          acceptableForPersistenceBridge:
            true,
          wordCount: 500,
          reasons: [],
        })
      },
    )

    it(
      'blocks a source-faithful QA result that falls below the canonical minimum instead of encouraging padding',
      () => {
        const result =
          evaluateFlashPrePersistenceEditorialQualityGate(
            editorial([
              words(
                401,
                'cuvant',
              ),
            ]),
          )

        expect(result).toEqual({
          acceptableForPersistenceBridge:
            false,
          wordCount: 401,
          reasons: [
            'below_minimum_word_count',
          ],
        })
      },
    )

    it(
      'blocks an obvious punctuation-only paragraph fragment',
      () => {
        const result =
          evaluateFlashPrePersistenceEditorialQualityGate(
            editorial([
              words(
                500,
                'cuvant',
              ),
              ',',
            ]),
          )

        expect(result).toEqual({
          acceptableForPersistenceBridge:
            false,
          wordCount: 501,
          reasons: [
            'punctuation_only_paragraph',
          ],
        })
      },
    )

    it(
      'blocks an editorial above the canonical maximum',
      () => {
        const result =
          evaluateFlashPrePersistenceEditorialQualityGate(
            editorial([
              words(
                1001,
                'cuvant',
              ),
            ]),
          )

        expect(result).toEqual({
          acceptableForPersistenceBridge:
            false,
          wordCount: 1001,
          reasons: [
            'above_maximum_word_count',
          ],
        })
      },
    )
  },
)
