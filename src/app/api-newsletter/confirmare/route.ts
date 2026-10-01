import { payloadClient } from '@/lib/payload'
import {
  decodeazaEmail,
  verificaToken,
  verificaTokenConfirmare,
} from '@/lib/newsletter-email'

const SITE = (process.env.SITE_URL || 'https://844-ai.ro').replace(/\/+$/, '')

type Rezultat = 'invalid' | 'inexistent'

function redirecteaza(lang: 'ro' | 'en', rezultat: Rezultat) {
  const url = new URL(`${SITE}/${lang}/confirmare-newsletter`)
  url.searchParams.set('rezultat', rezultat)

  return Response.redirect(url, 303)
}

function redirecteazaLaLinkSemnat(
  lang: 'ro' | 'en',
  params: {
    id?: string
    emailCodificat?: string
    ts: string
    sig: string
  },
) {
  const url = new URL(`${SITE}/${lang}/confirmare-newsletter`)

  if (params.id) {
    url.searchParams.set('i', params.id)
  } else if (params.emailCodificat) {
    url.searchParams.set('e', params.emailCodificat)
  }

  url.searchParams.set('t', params.ts)
  url.searchParams.set('s', params.sig)

  return Response.redirect(url, 303)
}

export async function POST(req: Request) {
  let form: FormData

  try {
    form = await req.formData()
  } catch {
    return redirecteaza('ro', 'invalid')
  }

  const id = String(form.get('i') ?? '')
  const emailCodificat = String(form.get('e') ?? '')
  const ts = String(form.get('t') ?? '')
  const sig = String(form.get('s') ?? '')
  const lang: 'ro' | 'en' = form.get('lang') === 'en' ? 'en' : 'ro'

  try {
    const payload = await payloadClient()

    if (id) {
      let abonat

      try {
        abonat = await payload.findByID({
          collection: 'newsletter',
          id,
        })
      } catch {
        return redirecteaza(lang, 'invalid')
      }

      if (!verificaTokenConfirmare(id, abonat.email, ts, sig)) {
        return redirecteaza(lang, 'invalid')
      }

      const redirectParams = {
        id,
        ts,
        sig,
      }

      if (abonat.confirmat) {
        return redirecteazaLaLinkSemnat(lang, redirectParams)
      }

      await payload.update({
        collection: 'newsletter',
        id: abonat.id,
        data: {
          confirmat: true,
        },
      })

      return redirecteazaLaLinkSemnat(lang, redirectParams)
    }

    // Compatibilitate temporară cu linkurile legacy deja trimise.
    const email = decodeazaEmail(emailCodificat)

    if (!verificaToken(email, ts, sig)) {
      return redirecteaza(lang, 'invalid')
    }

    const gasit = await payload.find({
      collection: 'newsletter',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    })

    const abonat = gasit.docs[0]

    if (!abonat) {
      return redirecteaza(lang, 'inexistent')
    }

    const redirectParams = {
      emailCodificat,
      ts,
      sig,
    }

    if (abonat.confirmat) {
      return redirecteazaLaLinkSemnat(lang, redirectParams)
    }

    await payload.update({
      collection: 'newsletter',
      id: abonat.id,
      data: {
        confirmat: true,
      },
    })

    return redirecteazaLaLinkSemnat(lang, redirectParams)
  } catch {
    return redirecteaza(lang, 'invalid')
  }
}
