import {
  lookup,
} from 'node:dns/promises'

import {
  BlockList,
  isIP,
} from 'node:net'

export interface FlashSourceResolvedAddress {
  address: string
  family: 4 | 6
}

export type FlashSourceHostnameResolver =
  (
    hostname: string,
  ) => Promise<
    FlashSourceResolvedAddress[]
  >

export type FlashSourceNetworkPolicyReason =
  | 'invalid_url'
  | 'credentials_not_allowed'
  | 'localhost_not_allowed'
  | 'non_public_ip'
  | 'dns_resolution_failed'
  | 'dns_no_addresses'
  | 'dns_non_public_address'

export interface FlashSourceNetworkPolicyResult {
  allowed: boolean
  reason:
    FlashSourceNetworkPolicyReason | null
  hostname: string | null
  resolvedAddresses:
    FlashSourceResolvedAddress[]
}

export interface FlashSourceNetworkPolicyOptions {
  resolveHostname?:
    FlashSourceHostnameResolver
}

const blockedAddresses =
  new BlockList()

const blockedIPv4Subnets:
  Array<[string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ]

for (
  const [
    network,
    prefix,
  ] of blockedIPv4Subnets
) {
  blockedAddresses.addSubnet(
    network,
    prefix,
    'ipv4',
  )
}

const blockedIPv6Subnets:
  Array<[string, number]> = [
    ['::', 128],
    ['::1', 128],

    // Discard-only.
    ['100::', 64],

    // Documentation.
    ['2001:db8::', 32],

    // Unique-local.
    ['fc00::', 7],

    // Link-local.
    ['fe80::', 10],

    // Multicast.
    ['ff00::', 8],
  ]

for (
  const [
    network,
    prefix,
  ] of blockedIPv6Subnets
) {
  blockedAddresses.addSubnet(
    network,
    prefix,
    'ipv6',
  )
}

const defaultResolver:
  FlashSourceHostnameResolver =
  async hostname => {
    const records =
      await lookup(
        hostname,
        {
          all: true,
          verbatim: true,
        },
      )

    return records.map(
      record => ({
        address:
          record.address,

        family:
          record.family === 6
            ? 6
            : 4,
      }),
    )
  }

function parseHttpUrl(
  value: string,
): URL | null {
  try {
    const url =
      new URL(value)

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      return null
    }

    return url.hostname
      ? url
      : null
  } catch {
    return null
  }
}

function normalizeHostname(
  hostname: string,
): string {
  let normalized =
    hostname
      .trim()
      .toLowerCase()
      .replace(/\.$/, '')

  if (
    normalized.startsWith('[') &&
    normalized.endsWith(']')
  ) {
    normalized =
      normalized.slice(
        1,
        -1,
      )
  }

  return normalized
}

function isLocalHostname(
  hostname: string,
): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith(
      '.localhost',
    ) ||
    hostname.endsWith(
      '.local',
    )
  )
}

function isIPv4MappedIPv6(
  address: string,
): boolean {
  return address
    .toLowerCase()
    .startsWith(
      '::ffff:',
    )
}

function isPublicIPAddress(
  address: string,
): boolean {
  const family =
    isIP(address)

  if (family === 4) {
    return !blockedAddresses.check(
      address,
      'ipv4',
    )
  }

  if (family === 6) {
    if (
      isIPv4MappedIPv6(
        address,
      )
    ) {
      return false
    }

    return !blockedAddresses.check(
      address,
      'ipv6',
    )
  }

  return false
}

function denied(
  reason:
    FlashSourceNetworkPolicyReason,
  hostname: string | null,
  resolvedAddresses:
    FlashSourceResolvedAddress[] = [],
): FlashSourceNetworkPolicyResult {
  return {
    allowed: false,
    reason,
    hostname,
    resolvedAddresses,
  }
}

export async function evaluateFlashSourceNetworkPolicy(
  rawUrl: string,
  options:
    FlashSourceNetworkPolicyOptions = {},
): Promise<FlashSourceNetworkPolicyResult> {
  const url =
    parseHttpUrl(
      rawUrl,
    )

  if (!url) {
    return denied(
      'invalid_url',
      null,
    )
  }

  const hostname =
    normalizeHostname(
      url.hostname,
    )

  if (
    url.username ||
    url.password
  ) {
    return denied(
      'credentials_not_allowed',
      hostname,
    )
  }

  if (
    isLocalHostname(
      hostname,
    )
  ) {
    return denied(
      'localhost_not_allowed',
      hostname,
    )
  }

  const literalFamily =
    isIP(hostname)

  if (
    literalFamily === 4 ||
    literalFamily === 6
  ) {
    if (
      !isPublicIPAddress(
        hostname,
      )
    ) {
      return denied(
        'non_public_ip',
        hostname,
        [
          {
            address: hostname,
            family:
              literalFamily,
          },
        ],
      )
    }

    return {
      allowed: true,
      reason: null,
      hostname,
      resolvedAddresses: [
        {
          address: hostname,
          family:
            literalFamily,
        },
      ],
    }
  }

  const resolveHostname =
    options.resolveHostname ??
    defaultResolver

  let resolvedAddresses:
    FlashSourceResolvedAddress[]

  try {
    resolvedAddresses =
      await resolveHostname(
        hostname,
      )
  } catch {
    return denied(
      'dns_resolution_failed',
      hostname,
    )
  }

  if (
    resolvedAddresses.length === 0
  ) {
    return denied(
      'dns_no_addresses',
      hostname,
    )
  }

  const hasUnsafeAddress =
    resolvedAddresses.some(
      resolved =>
        !isPublicIPAddress(
          resolved.address,
        ),
    )

  if (hasUnsafeAddress) {
    return denied(
      'dns_non_public_address',
      hostname,
      resolvedAddresses,
    )
  }

  return {
    allowed: true,
    reason: null,
    hostname,
    resolvedAddresses,
  }
}
