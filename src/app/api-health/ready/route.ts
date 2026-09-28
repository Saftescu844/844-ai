import {
  checkApplicationReadiness,
} from '@/lib/observability/applicationHealth'

import {
  createHttpRequestContext,
  finalizeHttpResponse,
  logHttpInternalFailure,
} from '@/lib/observability/httpRequestContext'

export async function GET(
  request:
    Request,
): Promise<Response> {
  const context =
    createHttpRequestContext(
      request,
      'health-ready-route',
    )

  const readiness =
    await checkApplicationReadiness()

  if (!readiness.ok) {
    logHttpInternalFailure(
      context,
      'READINESS_DATABASE_UNAVAILABLE',
    )
  }

  return finalizeHttpResponse(
    context,
    Response.json(
      readiness,
      {
        status:
          readiness.ok
            ? 200
            : 503,

        headers: {
          'Cache-Control':
            'no-store',
        },
      },
    ),
  )
}
