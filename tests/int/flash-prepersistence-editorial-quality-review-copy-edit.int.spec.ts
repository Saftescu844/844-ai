import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  applyFlashPrePersistenceEditorialQualityReviewCopyEdit,
  parseFlashPrePersistenceEditorialQualityReviewSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialQualityReviewSemanticOutput'

import type {
  FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

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

const editorial:
  FlashPrePersistenceEditorialGenerationSemanticOutput = {
    language: 'ro',
    editorialTitle:
      'Titlu inițial',
    editorialParagraphs: [
      words(300, 'primul'),
      words(300, 'aldoilea'),
    ],
  }

describe(
  'Flash pre-persistence controlled editorial copy edit',
  () => {
    it(
      'changes only explicitly indexed paragraphs and preserves order/count',
      () => {
        const review =
          parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
            JSON.stringify({
              language: 'ro',
              editorialTitle:
                'Titlu corectat',
              paragraphEdits: [
                {
                  paragraphIndex: 1,
                  replacement:
                    words(
                      300,
                      'corectat',
                    ),
                },
              ],
            }),
          )

        const result =
          applyFlashPrePersistenceEditorialQualityReviewCopyEdit({
            editorial,
            review,
          })

        expect(
          result.editorialParagraphs,
        ).toHaveLength(2)

        expect(
          result.editorialParagraphs[0],
        ).toBe(
          editorial.editorialParagraphs[0],
        )

        expect(
          result.editorialParagraphs[1],
        ).toContain(
          'corectat1',
        )
      },
    )

    it(
      'rejects duplicate paragraph indexes',
      () => {
        expect(
          () =>
            parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
              JSON.stringify({
                language: 'ro',
                editorialTitle:
                  'Titlu',
                paragraphEdits: [
                  {
                    paragraphIndex: 0,
                    replacement:
                      'Text corectat.',
                  },
                  {
                    paragraphIndex: 0,
                    replacement:
                      'Alt text.',
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output_paragraphs',
        )
      },
    )

    it(
      'rejects punctuation-only replacement text',
      () => {
        expect(
          () =>
            parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
              JSON.stringify({
                language: 'ro',
                editorialTitle:
                  'Titlu',
                paragraphEdits: [
                  {
                    paragraphIndex: 0,
                    replacement:
                      ',',
                  },
                ],
              }),
            ),
        ).toThrow(
          'invalid_output_paragraphs',
        )
      },
    )

    it(
      'rejects out-of-range paragraph indexes',
      () => {
        const review =
          parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
            JSON.stringify({
              language: 'ro',
              editorialTitle:
                'Titlu',
              paragraphEdits: [
                {
                  paragraphIndex: 9,
                  replacement:
                    words(
                      300,
                      'corectat',
                    ),
                },
              ],
            }),
          )

        expect(
          () =>
            applyFlashPrePersistenceEditorialQualityReviewCopyEdit({
              editorial,
              review,
            }),
        ).toThrow(
          'invalid_output_paragraphs',
        )
      },
    )

    it(
      'fails closed when copy edits remove more than the retention floor',
      () => {
        const review =
          parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
            JSON.stringify({
              language: 'ro',
              editorialTitle:
                'Titlu',
              paragraphEdits: [
                {
                  paragraphIndex: 0,
                  replacement:
                    words(
                      10,
                      'scurt',
                    ),
                },
              ],
            }),
          )

        expect(
          () =>
            applyFlashPrePersistenceEditorialQualityReviewCopyEdit({
              editorial,
              review,
            }),
        ).toThrow(
          'invalid_output_quality_review_retention',
        )
      },
    )
  },
)
