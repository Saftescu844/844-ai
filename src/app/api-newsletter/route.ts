import { payloadClient } from '@/lib/payload'
import { trimiteConfirmare } from '@/lib/newsletter-email'

type LimbaNewsletter = 'ro' | 'en'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function raspunsJSON(date: object, status: number): Response {
  return Response.json(date, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(req: Request) {
  let email = ''
  let limba: LimbaNewsletter = 'ro'

  try {
    const body: unknown = await req.json()

    if (!body || typeof body !== 'object') {
      return raspunsJSON({ ok: false, eroare: 'cerere_invalida' }, 400)
    }

    const date = body as Record<string, unknown>

    email = String(date.email ?? '')
      .trim()
      .toLowerCase()

    limba = date.limba === 'en' ? 'en' : 'ro'
  } catch {
    return raspunsJSON({ ok: false, eroare: 'cerere_invalida' }, 400)
  }

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return raspunsJSON({ ok: false, eroare: 'email_invalid' }, 400)
  }

  let payload

  try {
    payload = await payloadClient()
  } catch (eroare) {
    console.error('[newsletter] eroare conectare Payload:', eroare)

    return raspunsJSON({ ok: false, eroare: 'eroare_server' }, 500)
  }

  try {
    const existent = await payload.find({
      collection: 'newsletter',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    })

    const abonatExistent = existent.docs[0]

    if (abonatExistent?.confirmat) {
      return raspunsJSON({ ok: false, eroare: 'deja_abonat' }, 409)
    }

    if (abonatExistent) {
      try {
        await trimiteConfirmare(email, limba)

        return raspunsJSON(
          {
            ok: true,
            rezultat: 'confirmare_retrimisa',
          },
          200,
        )
      } catch (eroare) {
        console.error('[newsletter] eroare retrimitere confirmare:', eroare)

        return raspunsJSON(
          {
            ok: false,
            eroare: 'email_indisponibil',
          },
          503,
        )
      }
    }

    try {
      await payload.create({
        collection: 'newsletter',
        data: {
          email,
          limba,
          segment: ['general'],
          confirmat: false,
        } as any,
      })
    } catch (eroare) {
      console.error('[newsletter] eroare creare abonat:', eroare)

      return raspunsJSON({ ok: false, eroare: 'eroare_creare' }, 500)
    }

    try {
      await trimiteConfirmare(email, limba)

      return raspunsJSON(
        {
          ok: true,
          rezultat: 'confirmare_trimisa',
        },
        201,
      )
    } catch (eroare) {
      console.error('[newsletter] eroare trimitere confirmare:', eroare)

      return raspunsJSON(
        {
          ok: false,
          eroare: 'email_indisponibil',
        },
        503,
      )
    }
  } catch (eroare) {
    console.error('[newsletter] eroare procesare abonare:', eroare)

    return raspunsJSON({ ok: false, eroare: 'eroare_server' }, 500)
  }
}