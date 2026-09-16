import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashEditorialLexicalContent,
  buildVerifiedFlashEditorialLexicalContent,
  extractFlashEditorialParagraphs,
} from '@/lib/flash/editorialContentLexical'

const trickyParagraphs = [
  'și despre măsurile discutate',
  'atenție specială pentru IA și securitatea sistemelor',
  'Codului de bune practici și acestor clauze',
  'simpla existență nu anunță un rezultat.',
  'robots.txt, versiunea 3.5 și S.U.A.',
  'Diacritice: ă â î ș ț. Două  spații interne rămân.',
] as const

describe(
  'Flash editorial content Lexical integrity',
  () => {
    it(
      'builds one paragraph node with one text node per canonical paragraph',
      () => {
        const content =
          buildFlashEditorialLexicalContent(
            trickyParagraphs,
          )

        expect(
          content.root.children,
        ).toHaveLength(
          trickyParagraphs.length,
        )

        for (
          const [
            index,
            paragraph,
          ]
          of content.root.children.entries()
        ) {
          expect(
            paragraph.type,
          ).toBe(
            'paragraph',
          )

          expect(
            paragraph.children,
          ).toHaveLength(1)

          expect(
            paragraph.children[0],
          ).toMatchObject({
            type:
              'text',
            text:
              trickyParagraphs[index],
          })
        }
      },
    )

    it(
      'preserves Romanian text exactly through a Lexical round trip',
      () => {
        const content =
          buildFlashEditorialLexicalContent(
            trickyParagraphs,
          )

        expect(
          extractFlashEditorialParagraphs(
            content,
          ),
        ).toEqual(
          trickyParagraphs,
        )
      },
    )

    it(
      'preserves leading, trailing, and repeated spaces without normalization',
      () => {
        const paragraphs = [
          '  spațiu la început',
          'spațiu la final  ',
          'două  spații între cuvinte',
        ]

        const content =
          buildVerifiedFlashEditorialLexicalContent(
            paragraphs,
          )

        expect(
          extractFlashEditorialParagraphs(
            content,
          ),
        ).toEqual(
          paragraphs,
        )
      },
    )

    it(
      'fails closed for a Lexical paragraph split across multiple text nodes',
      () => {
        const malformed = {
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

                    text:
                      'și ',
                  },
                  {
                    type:
                      'text',

                    text:
                      'despre',
                  },
                ],
              },
            ],
          },
        }

        expect(
          () =>
            extractFlashEditorialParagraphs(
              malformed,
            ),
        ).toThrow(
          'invalid_lexical_shape',
        )
      },
    )
  },
)
