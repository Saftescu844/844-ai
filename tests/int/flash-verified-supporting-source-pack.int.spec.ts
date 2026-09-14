import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  FLASH_MAX_SUPPORTING_SOURCES,
  evaluateFlashVerifiedSupportingSourcePack,
  type FlashSupportingSourcePackCandidate,
} from '@/lib/flash/ingestion/verifiedSupportingSourcePack'

const registeredSourceUrl =
  'https://digital-strategy.ec.europa.eu/'

const primaryCanonicalUrl =
  'https://digital-strategy.ec.europa.eu/en/news/fourth-gpai-signatory-taskforce-meeting'

function supportingSource(
  id: string,
  concreteUrl: string,
  overrides: Partial<
    FlashSupportingSourcePackCandidate
  > = {},
): FlashSupportingSourcePackCandidate {
  return {
    id,
    registeredSourceUrl,
    concreteUrl,
    finalUrl:
      concreteUrl,
    retrieved: true,
    contentAvailable: true,
    textContent:
      `Verified supporting text for ${id}.`,
    ...overrides,
  }
}

describe(
  'Flash verified supporting source pack',
  () => {
    it(
      'accepts one or two distinct verified supporting documents from the registered source',
      () => {
        const result =
          evaluateFlashVerifiedSupportingSourcePack({
            primaryCanonicalUrl,
            supportingSources: [
              supportingSource(
                'gpai-code',
                'https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai',
                {
                  textContent:
                    '  The GPAI Code consists of Transparency, Copyright, and Safety and Security chapters.  ',
                },
              ),
              supportingSource(
                'gpai-taskforce',
                'https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice',
              ),
            ],
          })

        expect(result).toMatchObject({
          acceptableForSemanticUse: true,
          reasons: [],
          verification: {
            sourceVerificationPassed: true,
          },
        })

        expect(result.sources)
          .toHaveLength(2)

        expect(
          result.sources[0]
            ?.textContent,
        ).toBe(
          'The GPAI Code consists of Transparency, Copyright, and Safety and Security chapters.',
        )
      },
    )

    it(
      'fails closed when the primary URL is reused directly or after redirect resolution',
      () => {
        const result =
          evaluateFlashVerifiedSupportingSourcePack({
            primaryCanonicalUrl,
            supportingSources: [
              supportingSource(
                'primary-again',
                `${primaryCanonicalUrl}/`,
              ),
            ],
          })

        expect(result).toMatchObject({
          acceptableForSemanticUse: false,
          sources: [],
          reasons: [
            'primary_url_reused',
          ],
        })
      },
    )

    it(
      'fails closed when two supporting inputs resolve to the same URL',
      () => {
        const duplicateUrl =
          'https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai'

        const result =
          evaluateFlashVerifiedSupportingSourcePack({
            primaryCanonicalUrl,
            supportingSources: [
              supportingSource(
                'support-1',
                duplicateUrl,
              ),
              supportingSource(
                'support-2',
                `${duplicateUrl}/`,
              ),
            ],
          })

        expect(result).toMatchObject({
          acceptableForSemanticUse: false,
          sources: [],
          reasons: [
            'duplicate_supporting_url',
          ],
        })
      },
    )

    it(
      'fails closed when technical source verification or usable text is missing',
      () => {
        const result =
          evaluateFlashVerifiedSupportingSourcePack({
            primaryCanonicalUrl,
            supportingSources: [
              supportingSource(
                'unavailable',
                'https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai',
                {
                  retrieved: false,
                  contentAvailable: false,
                  textContent: '   ',
                },
              ),
            ],
          })

        expect(result).toMatchObject({
          acceptableForSemanticUse: false,
          sources: [],
          verification: {
            sourceVerificationPassed: false,
          },
          reasons: [
            'source_verification_failed',
            'supporting_text_unavailable',
          ],
        })
      },
    )

    it(
      'requires a bounded pack of one or two supporting sources',
      () => {
        const empty =
          evaluateFlashVerifiedSupportingSourcePack({
            primaryCanonicalUrl,
            supportingSources: [],
          })

        expect(empty).toMatchObject({
          acceptableForSemanticUse: false,
          sources: [],
          reasons: [
            'supporting_source_required',
          ],
        })

        const tooMany =
          evaluateFlashVerifiedSupportingSourcePack({
            primaryCanonicalUrl,
            supportingSources:
              Array.from(
                {
                  length:
                    FLASH_MAX_SUPPORTING_SOURCES +
                    1,
                },
                (_, index) =>
                  supportingSource(
                    `support-${String(index + 1)}`,
                    `https://digital-strategy.ec.europa.eu/en/policies/support-${String(index + 1)}`,
                  ),
              ),
          })

        expect(tooMany).toMatchObject({
          acceptableForSemanticUse: false,
          sources: [],
          reasons: [
            'too_many_supporting_sources',
          ],
        })
      },
    )
  },
)
