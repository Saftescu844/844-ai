import {
  evaluateFlashSourceNetworkPolicy,
  type FlashSourceNetworkPolicyOptions,
  type FlashSourceNetworkPolicyReason,
} from './sourceNetworkPolicy'

import type {
  FlashSourceVerificationCandidate,
} from './sourceVerificationEvidence'

export interface FlashSourceRetrievalInput {
  id: string
  registeredSourceUrl: string
  concreteUrl: string
}

export type FlashSourceRetrievalFailureReason =
  | 'invalid_registered_url'
  | 'invalid_concrete_url'
  | 'source_identity_mismatch'
  | 'redirect_without_location'
  | 'redirect_identity_mismatch'
  | 'redirect_limit_exceeded'
  | 'timeout'
  | 'network_error'
  | 'network_policy_blocked'
  | 'http_error'
  | 'empty_content'

export interface FlashSourceRetrievalResult {
  candidate: FlashSourceVerificationCandidate

  statusCode: number | null
  contentType: string | null
  bytesRead: number

  /**
   * Doar pentru conținut text-like.
   * Pentru PDF/binar rămâne null.
   */
  textContent: string | null

  failureReason:
    FlashSourceRetrievalFailureReason | null

  networkPolicyReason:
    FlashSourceNetworkPolicyReason | null
}

export interface FlashSourceRetrieverOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  maxRedirects?: number
  maxBytes?: number

  networkPolicyOptions?:
    FlashSourceNetworkPolicyOptions
}

const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_MAX_BYTES = 1_000_000

const REDIRECT_STATUSES =
  new Set([
    301,
    302,
    303,
    307,
    308,
  ])

function parseHttpUrl(
  value: string,
): URL | null {
  try {
    const url = new URL(value)

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

function normalizedHostname(
  url: URL,
): string {
  const hostname =
    url.hostname
      .toLowerCase()
      .replace(/\.$/, '')

  return hostname.startsWith('www.')
    ? hostname.slice(4)
    : hostname
}

function belongsToRegisteredSource(
  candidateUrl: URL,
  registeredUrl: URL,
): boolean {
  const candidateHost =
    normalizedHostname(candidateUrl)

  const registeredHost =
    normalizedHostname(registeredUrl)

  return (
    candidateHost ===
      registeredHost ||
    candidateHost.endsWith(
      `.${registeredHost}`,
    )
  )
}

function isTextLikeContentType(
  contentType: string | null,
): boolean {
  if (!contentType) {
    return true
  }

  const normalized =
    contentType.toLowerCase()

  return (
    normalized.startsWith('text/') ||
    normalized.includes(
      'application/json',
    ) ||
    normalized.includes(
      'application/xml',
    ) ||
    normalized.includes(
      'application/xhtml+xml',
    ) ||
    normalized.includes(
      'application/rss+xml',
    ) ||
    normalized.includes(
      'application/atom+xml',
    )
  )
}

async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<{
  bytesRead: number
  contentAvailable: boolean
  textContent: string | null
}> {
  if (!response.body) {
    return {
      bytesRead: 0,
      contentAvailable: false,
      textContent: null,
    }
  }

  const reader =
    response.body.getReader()

  const contentType =
    response.headers.get(
      'content-type',
    )

  const textLike =
    isTextLikeContentType(
      contentType,
    )

  const decoder =
    textLike
      ? new TextDecoder()
      : null

  let textContent = ''
  let bytesRead = 0

  try {
    while (
      bytesRead < maxBytes
    ) {
      const {
        done,
        value,
      } = await reader.read()

      if (done) {
        break
      }

      if (!value) {
        continue
      }

      const remaining =
        maxBytes - bytesRead

      const chunk =
        value.byteLength >
        remaining
          ? value.subarray(
              0,
              remaining,
            )
          : value

      bytesRead +=
        chunk.byteLength

      if (decoder) {
        textContent +=
          decoder.decode(
            chunk,
            {
              stream: true,
            },
          )
      }

      if (
        chunk.byteLength <
        value.byteLength
      ) {
        await reader.cancel()
        break
      }
    }

    if (decoder) {
      textContent +=
        decoder.decode()
    }
  } finally {
    reader.releaseLock()
  }

  return {
    bytesRead,

    contentAvailable:
      textLike
        ? textContent
            .trim()
            .length > 0
        : bytesRead > 0,

    textContent:
      textLike
        ? textContent
        : null,
  }
}

function failedResult(
  input:
    FlashSourceRetrievalInput,
  failureReason:
    FlashSourceRetrievalFailureReason,
  overrides: Partial<
    Pick<
      FlashSourceRetrievalResult,
      | 'statusCode'
      | 'contentType'
      | 'bytesRead'
      | 'textContent'
      | 'networkPolicyReason'
    >
  > = {},
): FlashSourceRetrievalResult {
  return {
    candidate: {
      id: input.id,
      registeredSourceUrl:
        input.registeredSourceUrl,
      concreteUrl:
        input.concreteUrl,
      finalUrl: null,
      retrieved: false,
      contentAvailable: false,
    },

    statusCode:
      overrides.statusCode ??
      null,

    contentType:
      overrides.contentType ??
      null,

    bytesRead:
      overrides.bytesRead ??
      0,

    textContent:
      overrides.textContent ??
      null,

    failureReason,

    networkPolicyReason:
      overrides.networkPolicyReason ??
      null,
  }
}

export async function retrieveFlashSource(
  input:
    FlashSourceRetrievalInput,
  options:
    FlashSourceRetrieverOptions = {},
): Promise<FlashSourceRetrievalResult> {
  const fetchImpl =
    options.fetchImpl ??
    fetch

  const timeoutMs =
    options.timeoutMs ??
    DEFAULT_TIMEOUT_MS

  const maxRedirects =
    options.maxRedirects ??
    DEFAULT_MAX_REDIRECTS

  const maxBytes =
    options.maxBytes ??
    DEFAULT_MAX_BYTES

  const registeredUrl =
    parseHttpUrl(
      input.registeredSourceUrl,
    )

  if (!registeredUrl) {
    return failedResult(
      input,
      'invalid_registered_url',
    )
  }

  const concreteUrl =
    parseHttpUrl(
      input.concreteUrl,
    )

  if (!concreteUrl) {
    return failedResult(
      input,
      'invalid_concrete_url',
    )
  }

  if (
    !belongsToRegisteredSource(
      concreteUrl,
      registeredUrl,
    )
  ) {
    return failedResult(
      input,
      'source_identity_mismatch',
    )
  }

  const initialNetworkPolicy =
    await evaluateFlashSourceNetworkPolicy(
      concreteUrl.toString(),
      options.networkPolicyOptions,
    )

  if (
    !initialNetworkPolicy.allowed
  ) {
    return failedResult(
      input,
      'network_policy_blocked',
      {
        networkPolicyReason:
          initialNetworkPolicy.reason,
      },
    )
  }

  const controller =
    new AbortController()

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs,
    )

  let currentUrl =
    concreteUrl

  let redirectCount = 0

  try {
    while (true) {
      let response: Response

      try {
        response =
          await fetchImpl(
            currentUrl,
            {
              method: 'GET',
              redirect: 'manual',
              signal:
                controller.signal,
              headers: {
                accept:
                  'text/html,application/xhtml+xml,application/json,application/xml,text/plain,application/pdf,*/*;q=0.5',
                'user-agent':
                  '844-ai-source-retriever/1.0',
              },
            },
          )
      } catch (error) {
        if (
          controller.signal
            .aborted
        ) {
          return failedResult(
            input,
            'timeout',
          )
        }

        void error

        return failedResult(
          input,
          'network_error',
        )
      }

      if (
        REDIRECT_STATUSES.has(
          response.status,
        )
      ) {
        const location =
          response.headers.get(
            'location',
          )

        if (!location) {
          return failedResult(
            input,
            'redirect_without_location',
            {
              statusCode:
                response.status,
            },
          )
        }

        if (
          redirectCount >=
          maxRedirects
        ) {
          return failedResult(
            input,
            'redirect_limit_exceeded',
            {
              statusCode:
                response.status,
            },
          )
        }

        let nextUrl: URL | null = null

        try {
          nextUrl =
            parseHttpUrl(
              new URL(
                location,
                currentUrl,
              ).toString(),
            )
        } catch {
          nextUrl = null
        }

        if (
          !nextUrl ||
          !belongsToRegisteredSource(
            nextUrl,
            registeredUrl,
          )
        ) {
          return failedResult(
            input,
            'redirect_identity_mismatch',
            {
              statusCode:
                response.status,
            },
          )
        }

        const redirectNetworkPolicy =
          await evaluateFlashSourceNetworkPolicy(
            nextUrl.toString(),
            options.networkPolicyOptions,
          )

        if (
          !redirectNetworkPolicy.allowed
        ) {
          return failedResult(
            input,
            'network_policy_blocked',
            {
              statusCode:
                response.status,

              networkPolicyReason:
                redirectNetworkPolicy.reason,
            },
          )
        }

        currentUrl =
          nextUrl

        redirectCount += 1

        continue
      }

      if (!response.ok) {
        return failedResult(
          input,
          'http_error',
          {
            statusCode:
              response.status,
            contentType:
              response.headers.get(
                'content-type',
              ),
          },
        )
      }

      let body: Awaited<
        ReturnType<
          typeof readLimitedBody
        >
      >

      try {
        body =
          await readLimitedBody(
            response,
            maxBytes,
          )
      } catch (error) {
        if (
          controller.signal
            .aborted
        ) {
          return failedResult(
            input,
            'timeout',
            {
              statusCode:
                response.status,
              contentType:
                response.headers.get(
                  'content-type',
                ),
            },
          )
        }

        void error

        return failedResult(
          input,
          'network_error',
          {
            statusCode:
              response.status,
            contentType:
              response.headers.get(
                'content-type',
              ),
          },
        )
      }

      const finalUrl =
        currentUrl.toString()

      if (
        !body.contentAvailable
      ) {
        return {
          candidate: {
            id: input.id,
            registeredSourceUrl:
              input.registeredSourceUrl,
            concreteUrl:
              input.concreteUrl,
            finalUrl,
            retrieved: true,
            contentAvailable:
              false,
          },

          statusCode:
            response.status,

          contentType:
            response.headers.get(
              'content-type',
            ),

          bytesRead:
            body.bytesRead,

          textContent:
            body.textContent,

          failureReason:
            'empty_content',

          networkPolicyReason:
            null,
        }
      }

      return {
        candidate: {
          id: input.id,
          registeredSourceUrl:
            input.registeredSourceUrl,
          concreteUrl:
            input.concreteUrl,
          finalUrl,
          retrieved: true,
          contentAvailable: true,
        },

        statusCode:
          response.status,

        contentType:
          response.headers.get(
            'content-type',
          ),

        bytesRead:
          body.bytesRead,

        textContent:
          body.textContent,

        failureReason: null,

        networkPolicyReason:
          null,
      }
    }
  } finally {
    clearTimeout(timeout)
  }
}
