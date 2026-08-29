import { payloadClient } from '@/lib/payload'
import { trimiteConfirmare } from '@/lib/newsletter-email'
import { revendicaTrimitereConfirmare } from '@/lib/newsletter-confirmation-cooldown'
import type { Newsletter } from '@/payload-types'

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

function raspunsPublic(): Response {
  return raspunsJSON(
    {
      ok: true,
      rezultat: 'verifica_emailul',
    },
    200,
  )
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
    return raspunsPublic()
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
      return raspunsPublic()
    }

    if (abonatExistent) {
      const revendicat = await revendicaTrimitereConfirmare(
        (sql, values) => payload.db.pool.query(sql, [...values]),
        abonatExistent.id,
      )

      if (!revendicat) {
        return raspunsPublic()
      }

      try {
        await trimiteConfirmare(
          abonatExistent.id,
          abonatExistent.email,
          limba,
        )
      } catch (eroare) {
        console.error('[newsletter] eroare retrimitere confirmare:', eroare)
      }

      return raspunsPublic()
    }

    let abonatNou: Newsletter

    try {
      abonatNou = await payload.create({
        collection: 'newsletter',
        data: {
          email,
          limba,
          segment: ['general'],
          confirmat: false,
          confirmationLastSentAt: new Date().toISOString(),
        },
      })
    } catch (eroare) {
      // Include și cursa legitimă în care alt request a creat între timp
      // aceeași adresă și constrângerea unique respinge acest create.
      console.error('[newsletter] eroare creare abonat:', eroare)
      return raspunsPublic()
    }

    try {
      await trimiteConfirmare(
        abonatNou.id,
        abonatNou.email,
        limba,
      )
    } catch (eroare) {
      console.error('[newsletter] eroare trimitere confirmare:', eroare)
    }

    return raspunsPublic()
  } catch (eroare) {
    console.error('[newsletter] eroare procesare abonare:', eroare)
    return raspunsPublic()
  }
}
