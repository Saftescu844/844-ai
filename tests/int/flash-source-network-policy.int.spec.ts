import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  evaluateFlashSourceNetworkPolicy,
  type FlashSourceHostnameResolver,
} from '@/lib/flash/runtimeEvidence/sourceNetworkPolicy'

function resolver(
  addresses:
    Array<{
      address: string
      family: 4 | 6
    }>,
): FlashSourceHostnameResolver {
  return async () =>
    addresses
}

describe(
  'Flash source network policy',
  () => {
    it(
      'permite domeniu care rezolvă numai la IP public',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://example.com/article',
            {
              resolveHostname:
                resolver([
                  {
                    address:
                      '93.184.216.34',
                    family: 4,
                  },
                ]),
            },
          )

        expect(result)
          .toMatchObject({
            allowed: true,
            reason: null,
            hostname:
              'example.com',
          })
      },
    )

    it(
      'permite IP public literal fără DNS',
      async () => {
        let resolverCalls = 0

        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://8.8.8.8/resource',
            {
              resolveHostname:
                async () => {
                  resolverCalls += 1
                  return []
                },
            },
          )

        expect(
          result.allowed,
        ).toBe(true)

        expect(
          resolverCalls,
        ).toBe(0)
      },
    )

    it(
      'respinge localhost fără DNS',
      async () => {
        let resolverCalls = 0

        const result =
          await evaluateFlashSourceNetworkPolicy(
            'http://localhost/admin',
            {
              resolveHostname:
                async () => {
                  resolverCalls += 1
                  return []
                },
            },
          )

        expect(
          result.reason,
        ).toBe(
          'localhost_not_allowed',
        )

        expect(
          resolverCalls,
        ).toBe(0)
      },
    )

    it(
      'respinge subdomeniu localhost',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'http://api.localhost/test',
          )

        expect(
          result.reason,
        ).toBe(
          'localhost_not_allowed',
        )
      },
    )

    it(
      'respinge hostname .local',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'http://printer.local/status',
          )

        expect(
          result.reason,
        ).toBe(
          'localhost_not_allowed',
        )
      },
    )

    it.each([
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '172.16.0.1',
      '192.168.1.1',
      '100.64.0.1',
    ])(
      'respinge IPv4 non-public %s',
      async address => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            `http://${address}/`,
          )

        expect(
          result.reason,
        ).toBe(
          'non_public_ip',
        )
      },
    )

    it(
      'respinge IPv4-mapped IPv6',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'http://[::ffff:127.0.0.1]/',
          )

        expect(
          result.reason,
        ).toBe(
          'non_public_ip',
        )
      },
    )

    it(
      'respinge IPv6 loopback',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'http://[::1]/',
          )

        expect(
          result.reason,
        ).toBe(
          'non_public_ip',
        )
      },
    )

    it(
      'respinge IPv6 unique-local',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'http://[fd00::1]/',
          )

        expect(
          result.reason,
        ).toBe(
          'non_public_ip',
        )
      },
    )

    it(
      'respinge DNS care rezolvă la adresă privată',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://example.com/',
            {
              resolveHostname:
                resolver([
                  {
                    address:
                      '192.168.1.20',
                    family: 4,
                  },
                ]),
            },
          )

        expect(
          result.reason,
        ).toBe(
          'dns_non_public_address',
        )
      },
    )

    it(
      'respinge răspuns DNS mixt public și privat',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://example.com/',
            {
              resolveHostname:
                resolver([
                  {
                    address:
                      '93.184.216.34',
                    family: 4,
                  },
                  {
                    address:
                      '10.0.0.5',
                    family: 4,
                  },
                ]),
            },
          )

        expect(
          result.reason,
        ).toBe(
          'dns_non_public_address',
        )

        expect(
          result.allowed,
        ).toBe(false)
      },
    )

    it(
      'gestionează eroarea DNS controlat',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://example.com/',
            {
              resolveHostname:
                async () => {
                  throw new Error(
                    'DNS unavailable',
                  )
                },
            },
          )

        expect(
          result.reason,
        ).toBe(
          'dns_resolution_failed',
        )
      },
    )

    it(
      'respinge DNS fără nicio adresă',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://example.com/',
            {
              resolveHostname:
                resolver([]),
            },
          )

        expect(
          result.reason,
        ).toBe(
          'dns_no_addresses',
        )
      },
    )

    it(
      'respinge URL cu credentiale',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://user:pass@example.com/article',
          )

        expect(
          result.reason,
        ).toBe(
          'credentials_not_allowed',
        )
      },
    )

    it(
      'respinge protocol non-HTTP',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'file:///etc/passwd',
          )

        expect(
          result.reason,
        ).toBe(
          'invalid_url',
        )
      },
    )

    it(
      'normalizează hostname cu punct terminal',
      async () => {
        const result =
          await evaluateFlashSourceNetworkPolicy(
            'https://example.com./article',
            {
              resolveHostname:
                resolver([
                  {
                    address:
                      '93.184.216.34',
                    family: 4,
                  },
                ]),
            },
          )

        expect(
          result.allowed,
        ).toBe(true)

        expect(
          result.hostname,
        ).toBe(
          'example.com',
        )
      },
    )
  },
)
