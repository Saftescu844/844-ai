import { trimiteConfirmareCont } from '@/lib/account-email'
import { payloadClient } from '@/lib/payload'
import { parsePublicAccountInput } from '@/lib/public-account'

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
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return raspunsInvalid('cerere')
  }

  const validare =
    parsePublicAccountInput(body)

  if (!validare.ok) {
    return raspunsInvalid(
      validare.camp,
    )
  }

  const {
    email,
    parola,
    nume,
    limba,
  } = validare.value

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
