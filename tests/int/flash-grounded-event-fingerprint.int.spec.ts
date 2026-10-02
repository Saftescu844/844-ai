import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashGroundedEventFingerprint,
} from '@/lib/flash/ingestion/groundedEventFingerprint'

describe(
  'Flash grounded event fingerprint',
  () => {
    it(
      'builds the expected deterministic SHA-256 fingerprint from grounded external identity',
      () => {
        const result =
          buildFlashGroundedEventFingerprint({
            authority:
              'eur-lex',
            stableId:
              'CELEX:32024R1689',
          })

        expect(result).toEqual({
          eventFingerprint:
            'fc4bf08fca243cf1b9a3e298899e4306a8a7f44c99d0a903cddebd79ff3952f5',
          eventFingerprintStatus:
            'grounded',
          identity: {
            authority:
              'eur-lex',
            stableId:
              'CELEX:32024R1689',
          },
        })
      },
    )

    it(
      'normalizes authority casing and surrounding whitespace but preserves stable identifier casing',
      () => {
        const result =
          buildFlashGroundedEventFingerprint({
            authority:
              '  EUR-LEX  ',
            stableId:
              '  CELEX:32024R1689  ',
          })

        expect(result.identity).toEqual({
          authority:
            'eur-lex',
          stableId:
            'CELEX:32024R1689',
        })
      },
    )

    it(
      'does not silently case-fold externally grounded identifiers',
      () => {
        const first =
          buildFlashGroundedEventFingerprint({
            authority:
              'example',
            stableId:
              'Event-ID-ABC',
          })

        const second =
          buildFlashGroundedEventFingerprint({
            authority:
              'example',
            stableId:
              'event-id-abc',
          })

        expect(
          second.eventFingerprint,
        ).not.toBe(
          first.eventFingerprint,
        )
      },
    )

    it(
      'rejects an empty identity authority',
      () => {
        expect(
          () =>
            buildFlashGroundedEventFingerprint({
              authority:
                '   ',
              stableId:
                'CVE-2026-1234',
            }),
        ).toThrow(
          'Flash event fingerprint requires a grounded identity authority.',
        )
      },
    )

    it(
      'rejects an empty stable identifier',
      () => {
        expect(
          () =>
            buildFlashGroundedEventFingerprint({
              authority:
                'cve',
              stableId:
                '   ',
            }),
        ).toThrow(
          'Flash event fingerprint requires a grounded stable identifier.',
        )
      },
    )

    it(
      'rejects using a source URL as the event stable identifier',
      () => {
        expect(
          () =>
            buildFlashGroundedEventFingerprint({
              authority:
                'digital-strategy.ec.europa.eu',
              stableId:
                'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting',
            }),
        ).toThrow(
          'Flash event fingerprint stable identifier must not be a source URL.',
        )
      },
    )
  },
)
