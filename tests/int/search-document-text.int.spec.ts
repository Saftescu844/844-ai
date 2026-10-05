import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildNormalizedSearchText,
  extractLexicalText,
  matchesAllSearchTokens,
} from '../../src/search/searchDocumentText'

describe('search document text', () => {
  it('extracts text from nested Lexical nodes', () => {
    const lexical = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Google folosește TEE',
              },
              {
                type: 'text',
                text: 'și jurnalul Rekor.',
              },
            ],
          },
        ],
      },
    }

    expect(
      extractLexicalText(lexical),
    ).toBe(
      'Google folosește TEE și jurnalul Rekor.',
    )
  })

  it('matches body terms without diacritics or case sensitivity', () => {
    const haystack =
      buildNormalizedSearchText([
        'Garanții de confidențialitate verificabile',
        'Învățare federată și protecția datelor',
      ])

    expect(
      matchesAllSearchTokens(
        haystack,
        [
          'GARANTII',
          'confidentialitate',
        ],
      ),
    ).toBe(true)
  })
})
