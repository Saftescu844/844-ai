import { payloadClient } from '@/lib/payload'
import {
  serializePublicComment,
  type PublicComment,
} from '@/lib/public-comments'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tip = url.searchParams.get('tip')
  const rawId = url.searchParams.get('id')
  const id = Number(rawId)

  if (
    (tip !== 'articol' && tip !== 'flash') ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return Response.json(
      {
        ok: false,
        eroare: 'cerere_invalida',
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  try {
    const payload = await payloadClient()
    const field =
      tip === 'articol'
        ? 'articol'
        : 'flash'

    const rezultat = await payload.find({
      collection: 'comentarii',
      overrideAccess: true,
      depth: 1,
      pagination: false,
      limit: 100,
      sort: 'createdAt',
      where: {
        and: [
          {
            status: {
              equals: 'aprobat',
            },
          },
          {
            [field]: {
              equals: id,
            },
          },
        ],
      },
    })

    const comentarii: PublicComment[] =
      rezultat.docs.map((comentariu) =>
        serializePublicComment(comentariu),
      )

    return Response.json(
      {
        ok: true,
        comentarii,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (eroare) {
    console.error('[api-comments] eroare citire comentarii:', eroare)

    return Response.json(
      {
        ok: false,
        eroare: 'indisponibil',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}
