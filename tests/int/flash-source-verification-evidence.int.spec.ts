import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashSourceVerification,
  type FlashSourceVerificationCandidate,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'

function source(
  overrides:
    Partial<FlashSourceVerificationCandidate> = {},
): FlashSourceVerificationCandidate {
  return {
    id: 'source-1',
    registeredSourceUrl:
      'https://example.com',
    concreteUrl:
      'https://example.com/article',
    finalUrl: null,
    retrieved: true,
    contentAvailable: true,
    ...overrides,
  }
}

describe(
  'Flash source verification evidence',
  () => {
    it(
      'verifică o sursă concretă validă',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source(),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(true)

        expect(
          result.evaluatedSources[0],
        ).toMatchObject({
          sourceIdentityMatches: true,
          retrievalPassed: true,
          contentAvailable: true,
          verified: true,
          reasons: [],
        })
      },
    )

    it(
      'normalizează www pentru aceeași sursă',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              registeredSourceUrl:
                'https://www.example.com',
              concreteUrl:
                'https://example.com/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(true)
      },
    )

    it(
      'acceptă un subdomeniu al sursei înregistrate',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              concreteUrl:
                'https://news.example.com/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(true)
      },
    )

    it(
      'nu confundă un domeniu care doar conține numele sursei',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              concreteUrl:
                'https://example.com.fake.test/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources[0]
            .reasons,
        ).toContain(
          'source_identity_mismatch',
        )
      },
    )

    it(
      'verifică identitatea folosind URL-ul final după redirect',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              concreteUrl:
                'https://example.com/redirect',
              finalUrl:
                'https://cdn.example.com/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(true)
      },
    )

    it(
      'nu acceptă URL intermediar străin chiar dacă redirectul final ajunge la sursa corectă',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              concreteUrl:
                'https://redirector.test/go',
              finalUrl:
                'https://example.com/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources[0]
            .reasons,
        ).toContain(
          'source_identity_mismatch',
        )
      },
    )

    it(
      'respinge redirectul final către alt domeniu',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              finalUrl:
                'https://other.test/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources[0]
            .reasons,
        ).toContain(
          'source_identity_mismatch',
        )
      },
    )

    it(
      'respinge URL concret invalid',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              concreteUrl:
                'not-a-url',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources[0]
            .reasons,
        ).toContain(
          'invalid_concrete_url',
        )
      },
    )

    it(
      'respinge retrieval eșuat',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              retrieved: false,
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources[0]
            .reasons,
        ).toContain(
          'retrieval_failed',
        )
      },
    )

    it(
      'respinge sursa când conținutul nu este disponibil',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              contentAvailable:
                false,
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources[0]
            .reasons,
        ).toContain(
          'content_unavailable',
        )
      },
    )

    it(
      'toate sursele trebuie să treacă verificarea',
      () => {
        const result =
          evaluateFlashSourceVerification([
            source({
              id: 'source-1',
            }),
            source({
              id: 'source-2',
              registeredSourceUrl:
                'https://second.test',
              concreteUrl:
                'https://wrong.test/article',
            }),
          ])

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources,
        ).toHaveLength(2)
      },
    )

    it(
      'fără surse concrete verificarea nu trece',
      () => {
        const result =
          evaluateFlashSourceVerification(
            [],
          )

        expect(
          result.sourceVerificationPassed,
        ).toBe(false)

        expect(
          result.evaluatedSources,
        ).toEqual([])
      },
    )
  },
)
