import {
  describe,
  expect,
  it,
} from 'vitest'

import type {
  FlashNormalizedArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import {
  evaluateExplicitGroundedEventIdentity,
} from '@/lib/flash/ingestion/explicitGroundedEventIdentity'

function candidate(
  overrides:
    Partial<FlashNormalizedArticleCandidate> = {},
): FlashNormalizedArticleCandidate {
  return {
    sourceId: 4,
    sourceName:
      'Comisia Europeană — AI Act',
    sourceRole:
      'primary',
    editorialTrust:
      'high',
    citationMode:
      'paraphrase',
    allowAutoPublish:
      false,
    language:
      'en',
    finalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/example',
    canonicalUrl:
      'https://digital-strategy.ec.europa.eu/en/news/example',
    title:
      'Example event',
    contentType:
      'NEWS ARTICLE',
    sourcePublicationDateRaw:
      '03 August 2026',
    sourcePublicationDate:
      '2026-08-03',
    lead:
      'Example lead.',
    bodyParagraphs: [
      'Example body.',
    ],
    bodyText:
      'Example body.',
    ...overrides,
  }
}

describe(
  'Flash explicit grounded event identity',
  () => {
    it(
      'keeps identity pending when no explicit stable identifier is present',
      () => {
        expect(
          evaluateExplicitGroundedEventIdentity(
            candidate(),
          ),
        ).toEqual({
          status:
            'pending',
          reason:
            'no_explicit_identifier',
          identity:
            null,
          candidates:
            [],
        })
      },
    )

    it(
      'grounds a CVE identifier found in the title',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              title:
                'Security update for cve-2026-12345',
            }),
          )

        expect(result.status)
          .toBe(
            'grounded',
          )

        expect(result.identity)
          .toEqual({
            authority:
              'cve',
            stableId:
              'CVE-2026-12345',
          })
      },
    )

    it(
      'grounds an explicitly prefixed DOI from the lead and canonicalizes it',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              lead:
                'Study DOI: 10.1234/ABC.Def. reports the result.',
            }),
          )

        expect(result.identity)
          .toEqual({
            authority:
              'doi',
            stableId:
              '10.1234/abc.def',
          })
      },
    )

    it(
      'grounds an explicitly prefixed CELEX identifier from the lead',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              lead:
                'Legal act CELEX: 32024R1689 applies.',
            }),
          )

        expect(result.identity)
          .toEqual({
            authority:
              'eur-lex-celex',
            stableId:
              '32024R1689',
          })
      },
    )

    it(
      'deduplicates the same explicit identifier repeated in body text',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              title:
                'CVE-2026-12345 update',
              bodyText:
                'The issue is CVE-2026-12345.',
            }),
          )

        expect(result.status)
          .toBe(
            'grounded',
          )

        expect(result.candidates)
          .toHaveLength(
            1,
          )
      },
    )

    it(
      'grounds an arXiv identifier from a source-adapter primary evidence link',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              primaryEvidenceUrls: [
                'https://arxiv.org/abs/2609.20738v2?utm_source=test#paper',
              ],
            }),
          )

        expect(result).toMatchObject({
          status:
            'grounded',
          reason:
            'single_explicit_primary_identifier',
          identity: {
            authority:
              'arxiv',
            stableId:
              '2609.20738',
          },
        })
      },
    )

    it('grounds an explicitly linked MIT primary IEEE document ID, without manufacturing a DOI', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://ieeexplore.ieee.org/document/11714300',
          ],
        }),
      )
      expect(result).toMatchObject({
        status: 'grounded',
        reason: 'single_explicit_primary_identifier',
        identity: {
          authority: 'ieee-xplore',
          stableId: '11714300',
        },
      })
    })

    it.each([
      'http://ieeexplore.ieee.org/document/11714300',
      'https://user@ieeexplore.ieee.org/document/11714300',
      'https://ieeexplore.ieee.org:8443/document/11714300',
      'https://ieeexplore.ieee.org.attacker.test/document/11714300',
      'https://ieeexplore.ieee.org/document/not-a-number',
      'https://ieeexplore.ieee.org/document/11714300/pdf',
      'https://ieeexplore.ieee.org/document/00000000',
    ])('keeps identity pending for untrusted IEEE link: %s', url => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({ primaryEvidenceUrls: [url] }),
      )
      expect(result.status).toBe('pending')
      expect(result.identity).toBeNull()
    })

    it('keeps mixed IEEE document and DOI evidence ambiguous, not silently aliased', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://ieeexplore.ieee.org/document/11714300',
            'https://doi.org/10.1109/tro.2026.3738474',
          ],
        }),
      )
      expect(result.status).toBe('ambiguous')
      expect(result.identity).toBeNull()
    })

    it('grounds a primary MIT DOI permalink deterministically', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://doi.org/10.1109/tro.2026.3738474',
          ],
        }),
      )
      expect(result).toMatchObject({
        status: 'grounded',
        reason: 'single_explicit_primary_identifier',
        identity: {
          authority: 'doi',
          stableId: '10.1109/tro.2026.3738474',
        },
      })
    })

    it('does not accept malformed or third-party DOI lookalikes as primary evidence', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://doi.org.evil.example/10.1109/tro.2026.3738474',
            'http://doi.org/10.1109/tro.2026.3738474',
            'https://doi.org/not-a-doi',
            'https://ieeexplore.ieee.org/document/invalid-id',
          ],
        }),
      )
      expect(result.status).toBe('pending')
      expect(result.reason).toBe('no_explicit_identifier')
    })

    it('fails closed when different primary DOI and arXiv identities conflict', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://doi.org/10.1109/tro.2026.3738474',
            'https://arxiv.org/abs/2604.07599',
          ],
        }),
      )
      expect(result.status).toBe('ambiguous')
      expect(result.identity).toBeNull()
    })

    it('grounds an official NBER Paper link as its documented working-paper DOI', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://www.nber.org/papers/w35720',
          ],
        }),
      )
      expect(result).toMatchObject({
        status: 'grounded',
        reason: 'single_explicit_primary_identifier',
        identity: {
          authority: 'doi',
          stableId: '10.3386/w35720',
        },
      })
    })

    it('gives labelled primary NBER evidence precedence over a matching body-only DOI', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          bodyText: 'The report DOI: 10.3386/w35720 is referenced.',
          primaryEvidenceUrls: [
            'https://nber.org/papers/w35720?utm_source=example#paper',
          ],
        }),
      )
      expect(result.status).toBe('grounded')
      expect(result.identity).toEqual({
        authority: 'doi',
        stableId: '10.3386/w35720',
      })
      expect(result.candidates).toHaveLength(1)
    })

    it.each([
      'http://www.nber.org/papers/w35720',
      'https://user@www.nber.org/papers/w35720',
      'https://www.nber.org:444/papers/w35720',
      'https://nber.org.example.com/papers/w35720',
      'https://www.nber.org/papers/w35720.pdf',
      'https://www.nber.org/papers/random',
    ])('does not ground event identity from an invalid NBER evidence URL: %s', url => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({ primaryEvidenceUrls: [url] }),
      )
      expect(result.status).toBe('pending')
      expect(result.identity).toBeNull()
    })

    it('blocks a conflicting NBER DOI and arXiv identifier as ambiguous', () => {
      const result = evaluateExplicitGroundedEventIdentity(
        candidate({
          primaryEvidenceUrls: [
            'https://www.nber.org/papers/w35720',
            'https://arxiv.org/abs/2609.20738',
          ],
        }),
      )
      expect(result.status).toBe('ambiguous')
      expect(result.identity).toBeNull()
    })

    it(
      'marks multiple distinct primary arXiv evidence links as ambiguous',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              primaryEvidenceUrls: [
                'https://arxiv.org/abs/2609.20738',
                'https://arxiv.org/abs/2608.28534',
              ],
            }),
          )

        expect(result).toMatchObject({
          status:
            'ambiguous',
          reason:
            'multiple_explicit_primary_identifiers',
          identity:
            null,
        })
      },
    )

    it(
      'keeps a body-only identifier pending because it may be contextual',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              bodyText:
                'Background reference: CVE-2026-12345.',
            }),
          )

        expect(result).toMatchObject({
          status:
            'pending',
          reason:
            'body_only_identifier',
          identity:
            null,
        })
      },
    )

    it(
      'grounds one body-only identifier when the operator confirms that exact extracted identity',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              bodyText:
                'Research result DOI: 10.1234/ABC.Def.',
            }),
            {
              confirmedBodyIdentity: {
                authority:
                  'doi',
                stableId:
                  '10.1234/abc.def',
              },
            },
          )

        expect(result).toMatchObject({
          status:
            'grounded',
          reason:
            'operator_confirmed_body_identifier',
          identity: {
            authority:
              'doi',
            stableId:
              '10.1234/abc.def',
          },
        })
      },
    )

    it(
      'fails closed when operator confirmation does not match the unique body-only identifier',
      () => {
        expect(
          () =>
            evaluateExplicitGroundedEventIdentity(
              candidate({
                bodyText:
                  'Research result DOI: 10.1234/ABC.Def.',
              }),
              {
                confirmedBodyIdentity: {
                  authority:
                    'doi',
                  stableId:
                    '10.9999/not-the-source-identifier',
                },
              },
            ),
        ).toThrow(
          'Flash explicit event identity confirmation does not match the unique body-only identifier.',
        )
      },
    )

    it(
      'fails closed when operator confirmation tries to choose among multiple body-only identifiers',
      () => {
        expect(
          () =>
            evaluateExplicitGroundedEventIdentity(
              candidate({
                bodyText:
                  'References CVE-2026-12345 and CVE-2026-54321.',
              }),
              {
                confirmedBodyIdentity: {
                  authority:
                    'cve',
                  stableId:
                    'CVE-2026-12345',
                },
              },
            ),
        ).toThrow(
          'Flash explicit event identity confirmation requires exactly one body-only identifier.',
        )
      },
    )

    it(
      'marks multiple different primary identifiers as ambiguous',
      () => {
        const result =
          evaluateExplicitGroundedEventIdentity(
            candidate({
              title:
                'CVE-2026-12345 and CVE-2026-54321 update',
            }),
          )

        expect(result).toMatchObject({
          status:
            'ambiguous',
          reason:
            'multiple_explicit_primary_identifiers',
          identity:
            null,
        })

        expect(result.candidates)
          .toHaveLength(
            2,
          )
      },
    )
  },
)
