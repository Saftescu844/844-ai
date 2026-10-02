import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashAi,
} from '@/payload-types'

import {
  buildFlashSemanticDocument,
} from '@/lib/flash/semanticEvidence/semanticDocument'

function lexicalContent(
  text:
    string,
): FlashAi['continut'] {
  return {
    root: {
      type:
        'root',

      children: [
        {
          type:
            'paragraph',

          children: [
            {
              type:
                'text',

              text,

              detail:
                0,

              format:
                0,

              mode:
                'normal',

              style:
                '',

              version:
                1,
            },
          ],

          direction:
            null,

          format:
            '',

          indent:
            0,

          textFormat:
            0,

          textStyle:
            '',

          version:
            1,
        },
      ],

      direction:
        null,

      format:
        '',

      indent:
        0,

      version:
        1,
    },
  }
}

function emptyLexicalContent():
  FlashAi['continut'] {
  return {
    root: {
      type:
        'root',

      children:
        [],

      direction:
        null,

      format:
        '',

      indent:
        0,

      version:
        1,
    },
  }
}

function flash(
  overrides:
    Partial<FlashAi> = {},
): FlashAi {
  return {
    id:
      1,

    titlu:
      'Flash semantic test',

    slug:
      'flash-semantic-test',

    limba:
      'ro',

    pilon:
      1,

    flashType:
      'research',

    excerpt:
      'Rezumat scurt.',

    continut:
      lexicalContent(
        'Conținut factual pentru analiză.',
      ),

    informationStatus:
      'confirmed',

    riskLevel:
      'low',

    isHealthRelated:
      false,

    editorialStatus:
      'draft',

    automationDecision:
      'review',

    generatAutomat:
      false,

    createdAt:
      '2026-09-05T08:00:00.000Z',

    updatedAt:
      '2026-09-05T08:00:00.000Z',

    _status:
      'draft',

    ...overrides,
  } as FlashAi
}

describe(
  'Flash semantic document',
  () => {
    it(
      'converts Flash content to provider-agnostic text',
      () => {
        const result =
          buildFlashSemanticDocument(
            flash(),
          )

        expect(
          result,
        ).toEqual({
          flashId:
            1,

          language:
            'ro',

          title:
            'Flash semantic test',

          excerpt:
            'Rezumat scurt.',

          bodyText:
            'Conținut factual pentru analiză.',

          metadata: {
            flashType:
              'research',

            informationStatus:
              'confirmed',

            riskLevel:
              'low',

            isHealthRelated:
              false,

            medicalEvidenceType:
              'notApplicable',

            clinicalValidationStatus:
              'notApplicable',
          },
        })
      },
    )

    it(
      'normalizes optional excerpt whitespace',
      () => {
        const result =
          buildFlashSemanticDocument(
            flash({
              titlu:
                '  Titlu curat  ',

              excerpt:
                '   ',
            }),
          )

        expect(
          result.title,
        ).toBe(
          'Titlu curat',
        )

        expect(
          result.excerpt,
        ).toBeNull()
      },
    )

    it(
      'preserves health metadata explicitly',
      () => {
        const result =
          buildFlashSemanticDocument(
            flash({
              isHealthRelated:
                true,

              medicalEvidenceType:
                'clinicalStudy',

              clinicalValidationStatus:
                'underEvaluation',

              riskLevel:
                'medium',
            }),
          )

        expect(
          result.metadata,
        ).toMatchObject({
          isHealthRelated:
            true,

          medicalEvidenceType:
            'clinicalStudy',

          clinicalValidationStatus:
            'underEvaluation',

          riskLevel:
            'medium',
        })
      },
    )

    it(
      'supports an empty Lexical document without inventing content',
      () => {
        const result =
          buildFlashSemanticDocument(
            flash({
              continut:
                emptyLexicalContent(),
            }),
          )

        expect(
          result.bodyText,
        ).toBe('')
      },
    )
  },
)
