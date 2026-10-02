import {
  createHttpRequestContext,
  finalizeHttpResponse,
  logHttpInternalFailure,
} from '@/lib/observability/httpRequestContext'
import { payloadClient } from '@/lib/payload'
import { parsePublicAccountInput } from '@/lib/public-account'
import { claimPublicRegistrationAttempt } from '@/lib/public-registration-rate-limit'

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
  const requestContext =
    createHttpRequestContext(
      req,
      'api-account-register',
    )

  const reply =
    (
      response:
        Response,
    ) =>
      finalizeHttpResponse(
        requestContext,
        response,
      )

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return reply(
      raspunsInvalid(
        'cerere',
      ),
    )
  }

  const validare =
    parsePublicAccountInput(body)

  if (!validare.ok) {
    return reply(
      raspunsInvalid(
        validare.camp,
      ),
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
  } catch {
    logHttpInternalFailure(
      requestContext,
      'ACCOUNT_REGISTER_PAYLOAD_UNAVAILABLE',
    )

    return reply(
      raspunsPublic(),
    )
  }

  try {
    const allowed =
      await claimPublicRegistrationAttempt(
        (sql, values) =>
          payload.db.pool.query(
            sql,
            [...values],
          ),
        req.headers,
        process.env.PAYLOAD_SECRET || '',
      )

    if (!allowed) {
      return reply(
        raspunsPublic(),
      )
    }
  } catch {
    logHttpInternalFailure(
      requestContext,
      'ACCOUNT_REGISTER_RATE_LIMIT_FAILED',
    )

    return reply(
      raspunsPublic(),
    )
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
      return reply(
        raspunsPublic(),
      )
    }
  } catch {
    logHttpInternalFailure(
      requestContext,
      'ACCOUNT_REGISTER_LOOKUP_FAILED',
    )

    return reply(
      raspunsPublic(),
    )
  }

  try {
    await payload.create({
      collection: 'useri',
      overrideAccess: true,
      data: {
        email,
        password: parola,
        nume,
        rol: 'cititor',
        nivelAbonament: 'gratuit',
        limbaPreferata: limba,
        abonatNewsletter: false,
      },
    })

    return reply(
      raspunsPublic(),
    )
  } catch {
    logHttpInternalFailure(
      requestContext,
      'ACCOUNT_REGISTER_CREATE_OR_SEND_FAILED',
    )

    return reply(
      raspunsPublic(),
    )
  }
}
