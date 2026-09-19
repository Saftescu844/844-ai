import { trimiteConfirmareCont } from '@/lib/account-email'
import { payloadClient } from '@/lib/payload'

type LimbaCont = 'ro' | 'en'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 10
const PASSWORD_MAX = 128
const NUME_MAX = 80

function raspunsPublic(): Response {
  return Response.json(
    {
      ok: true,
      rezultat: 'verifica_emailul',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

function raspunsInvalid(camp: string): Response {
  return Response.json(
    {
      ok: false,
      eroare: 'date_invalide',
      camp,
    },
    {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

export async function POST(req: Request) {
  let email = ''
  let parola = ''
  let nume = ''
  let limba: LimbaCont = 'ro'

  try {
    const body: unknown = await req.json()

    if (!body || typeof body !== 'object') {
      return raspunsInvalid('cerere')
    }

    const date = body as Record<string, unknown>

    email = String(date.email ?? '')
      .trim()
      .toLowerCase()

    parola = String(date.parola ?? '')
    nume = String(date.nume ?? '').trim()
    limba = date.limba === 'en' ? 'en' : 'ro'
  } catch {
    return raspunsInvalid('cerere')
  }

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return raspunsInvalid('email')
  }

  if (
    parola.length < PASSWORD_MIN ||
    parola.length > PASSWORD_MAX
  ) {
    return raspunsInvalid('parola')
  }

  if (nume.length < 2 || nume.length > NUME_MAX) {
    return raspunsInvalid('nume')
  }

  let payload

  try {
    payload = await payloadClient()
  } catch (eroare) {
    console.error('[account-register] Payload indisponibil:', eroare)
    return raspunsPublic()
  }

  try {
    const existent = await payload.find({
      collection: 'useri',
      overrideAccess: true,
      showHiddenFields: true,
      limit: 1,
      where: {
        email: {
          equals: email,
        },
      },
    })

    if (existent.docs.length > 0) {
      return raspunsPublic()
    }
  } catch (eroare) {
    console.error('[account-register] eroare verificare email existent:', eroare)
    return raspunsPublic()
  }

  let userId: number | string | null = null

  try {
    const user = await payload.create({
      collection: 'useri',
      overrideAccess: true,
      showHiddenFields: true,
      disableVerificationEmail: true,
      data: {
        email,
        password: parola,
        nume,
        rol: 'cititor',
        nivelAbonament: 'gratuit',
        limbaPreferata: limba,
        abonatNewsletter: false,
        _verified: false,
      },
    })

    userId = user.id

    const token = user._verificationToken

    if (!token) {
      throw new Error('Payload nu a generat tokenul de verificare')
    }

    await trimiteConfirmareCont(
      email,
      token,
      limba,
    )

    return raspunsPublic()
  } catch (eroare) {
    console.error('[account-register] eroare creare/trimitere:', eroare)

    if (userId !== null) {
      try {
        await payload.delete({
          collection: 'useri',
          id: userId,
          overrideAccess: true,
        })
      } catch (cleanupError) {
        console.error(
          '[account-register] cleanup user neconfirmat eșuat:',
          cleanupError,
        )
      }
    }

    return raspunsPublic()
  }
}
