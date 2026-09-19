import { payloadClient } from '@/lib/payload'

type PublicComment = {
  id: number | string
  continut: string
  createdAt: string
  raspunsLa: number | string | null
  autor: {
    nume: string
  }
}

function relatieId(
  value: unknown,
): number | string | null {
  if (
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    'id' in value
  ) {
    const id = (value as { id?: unknown }).id

    if (
      typeof id === 'number' ||
      typeof id === 'string'
    ) {
      return id
    }
  }

  return null
}

function numePublicAutor(
  value: unknown,
): string {
  if (
    value &&
    typeof value === 'object' &&
    'nume' in value
  ) {
    const nume = String(
      (value as { nume?: unknown }).nume ?? '',
    ).trim()

    if (nume) {
      return nume.slice(0, 80)
    }
  }

  return 'Cititor 844-ai'
}

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
      rezultat.docs.map((comentariu) => ({
        id: comentariu.id,
        continut: comentariu.continut,
        createdAt: comentariu.createdAt,
        raspunsLa: relatieId(comentariu.raspunsLa),
        autor: {
          nume: numePublicAutor(comentariu.autor),
        },
      }))

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
