import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashDedup,
  normalizeDedupTitle,
  type FlashDedupRecord,
} from '@/lib/flash/runtimeEvidence/dedupEvidence'

const candidate = (
  overrides:
    Partial<FlashDedupRecord> = {},
): FlashDedupRecord => ({
  id: 10,
  language: 'ro',
  title:
    'OpenAI lansează o nouă platformă educațională',
  eventFingerprint:
    'event-openai-education-2026',
  sourceFingerprint:
    'source-example-123',
  ...overrides,
})

describe(
  'Flash runtime evidence - dedup',
  () => {
    it(
      'trece când nu există niciun semnal de duplicare',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate(),
            existing: [
              candidate({
                id: 20,
                title:
                  'Alt eveniment complet diferit',
                eventFingerprint:
                  'different-event',
                sourceFingerprint:
                  'different-source',
              }),
            ],
          })

        expect(result).toEqual({
          dedupPassed: true,
          obviousDuplicate: false,
          reasons: [],
          matches: [],
        })
      },
    )

    it(
      'eventFingerprint identic marchează duplicat evident',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate(),
            existing: [
              candidate({
                id: 20,
                title:
                  'Altă formulare a aceluiași eveniment',
                sourceFingerprint:
                  'another-source',
              }),
            ],
          })

        expect(result.dedupPassed)
          .toBe(false)

        expect(result.obviousDuplicate)
          .toBe(true)

        expect(result.reasons)
          .toContain(
            'event_fingerprint_match',
          )
      },
    )

    it(
      'sourceFingerprint identic cere review, nu BLOCK',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate(),
            existing: [
              candidate({
                id: 20,
                title:
                  'Actualizare diferită',
                eventFingerprint:
                  'different-event',
              }),
            ],
          })

        expect(result.dedupPassed)
          .toBe(false)

        expect(result.obviousDuplicate)
          .toBe(false)

        expect(result.reasons)
          .toContain(
            'source_fingerprint_match',
          )
      },
    )

    it(
      'titlul identic după normalizare cere review',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate({
              sourceFingerprint:
                'candidate-source',
            }),
            existing: [
              candidate({
                id: 20,
                title:
                  'OPENAI   lanseaza o noua platforma educationala!',
                eventFingerprint:
                  'different-event',
                sourceFingerprint:
                  'different-source',
              }),
            ],
          })

        expect(result.dedupPassed)
          .toBe(false)

        expect(result.obviousDuplicate)
          .toBe(false)

        expect(result.reasons)
          .toContain(
            'normalized_title_match',
          )
      },
    )

    it(
      'nu compară titlul RO cu titlul EN ca duplicat textual',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate({
              sourceFingerprint:
                'candidate-source',
            }),
            existing: [
              candidate({
                id: 20,
                language: 'en',
                title:
                  'OpenAI lanseaza o noua platforma educationala',
                eventFingerprint:
                  'different-event',
                sourceFingerprint:
                  'different-source',
              }),
            ],
          })

        expect(result.dedupPassed)
          .toBe(true)
      },
    )

    it(
      'perechea RO/EN poate fi ignorată explicit',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate(),
            existing: [
              candidate({
                id: 20,
                language: 'en',
                title:
                  'OpenAI launches a new education platform',
              }),
            ],
            ignoreExistingIds: [20],
          })

        expect(result).toEqual({
          dedupPassed: true,
          obviousDuplicate: false,
          reasons: [],
          matches: [],
        })
      },
    )

    it(
      'documentul candidat nu se compară cu el însuși',
      () => {
        const current =
          candidate()

        const result =
          evaluateFlashDedup({
            candidate: current,
            existing: [current],
          })

        expect(result.dedupPassed)
          .toBe(true)

        expect(result.matches)
          .toEqual([])
      },
    )

    it(
      'lipsa eventFingerprint nu poate trece deduplicarea',
      () => {
        const result =
          evaluateFlashDedup({
            candidate: candidate({
              eventFingerprint: null,
              sourceFingerprint:
                'unique-source',
            }),
            existing: [],
          })

        expect(result).toEqual({
          dedupPassed: false,
          obviousDuplicate: false,
          reasons: [
            'missing_event_fingerprint',
          ],
          matches: [],
        })
      },
    )

    it(
      'normalizarea titlului tratează diacriticele și spațiile consistent',
      () => {
        expect(
          normalizeDedupTitle(
            '  Știință, EDUCAȚIE & Inteligență! ',
          ),
        ).toBe(
          'stiinta educatie inteligenta',
        )
      },
    )
  },
)
