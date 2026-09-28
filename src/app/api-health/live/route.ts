import {
  createHttpRequestContext,
  finalizeHttpResponse,
} from '@/lib/observability/httpRequestContext'

export async function GET(
  request:
    Request,
): Promise<Response> {
  const context =
    createHttpRequestContext(
      request,
      'health-live-route',
    )

  return finalizeHttpResponse(
    context,
    Response.json(
      {
        ok:
          true,

        status:
          'live',
      },
      {
        status:
          200,

        headers: {
          'Cache-Control':
            'no-store',
        },
      },
    ),
  )
}
