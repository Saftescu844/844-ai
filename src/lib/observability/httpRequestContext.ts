import {
  randomUUID,
} from 'node:crypto'

import {
  serializeStructuredRuntimeEvent,
} from '@/lib/observability/structuredRuntimeEvent'

export interface HttpRequestContext {
  requestId:
    string

  component:
    string

  method:
    string

  path:
    string

  startedAtMs:
    number
}

export function createHttpRequestContext(
  request:
    Request,

  component:
    string,

  options: {
    nowMs?:
      () => number

    requestIdFactory?:
      () => string
  } = {},
): HttpRequestContext {
  const url =
    new URL(
      request.url,
    )

  const nowMs =
    options.nowMs ??
    Date.now

  const requestIdFactory =
    options.requestIdFactory ??
    randomUUID

  return {
    requestId:
      requestIdFactory(),

    component:
      component.trim(),

    method:
      request.method,

    path:
      url.pathname,

    startedAtMs:
      nowMs(),
  }
}

function durationMs(
  context:
    HttpRequestContext,
  nowMs:
    () => number,
): number {
  return Math.max(
    0,
    nowMs() -
      context.startedAtMs,
  )
}

export function logHttpInternalFailure(
  context:
    HttpRequestContext,

  errorCode:
    string,

  nowMs:
    () => number =
      Date.now,
): void {
  console.error(
    serializeStructuredRuntimeEvent({
      event:
        'http.request.internal-failure',

      component:
        context.component,

      status:
        'failed',

      correlationId:
        context.requestId,

      data: {
        errorCode,

        method:
          context.method,

        path:
          context.path,

        durationMs:
          durationMs(
            context,
            nowMs,
          ),
      },
    }),
  )
}

export function finalizeHttpResponse(
  context:
    HttpRequestContext,

  response:
    Response,

  nowMs:
    () => number =
      Date.now,
): Response {
  const headers =
    new Headers(
      response.headers,
    )

  headers.set(
    'X-Request-ID',
    context.requestId,
  )

  const status =
    response.status >=
      500
      ? 'failed'
      : 'success'

  const serialized =
    serializeStructuredRuntimeEvent({
      event:
        'http.request.completed',

      component:
        context.component,

      status,

      correlationId:
        context.requestId,

      data: {
        method:
          context.method,

        path:
          context.path,

        httpStatus:
          response.status,

        durationMs:
          durationMs(
            context,
            nowMs,
          ),
      },
    })

  if (
    status ===
    'failed'
  ) {
    console.error(
      serialized,
    )
  } else {
    console.log(
      serialized,
    )
  }

  return new Response(
    response.body,
    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers,
    },
  )
}
