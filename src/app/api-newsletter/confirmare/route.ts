import { payloadClient } from '@/lib/payload'
import { decodeazaEmail, verificaToken } from '@/lib/newsletter-email'

const SITE = (process.env.SITE_URL || 'https://844-ai.ro').replace(/\/+$/, '')

type Rezultat = 'invalid' | 'inexistent'

function redirecteaza(lang: 'ro' | 'en', rezultat: Rezultat) {
  const url = new URL(`${SITE}/${lang}/confirmare-newsletter`)
  url.searchParams.set('rezultat', rezultat)

  return Response.redirect(url, 303)
}

function redirecteazaLaLinkSemnat(
  lang: 'ro' | 'en',
  emailCodificat: string,
  ts: string,
  sig: string,
) {
  const url = new URL(`${SITE}/${lang}/confirmare-newsletter`)
  url.searchParams.set('e', emailCodificat)
  url.searchParams.set('t', ts)
  url.searchParams.set('s', sig)

  return Response.redirect(url, 303)
}

export async function POST(req: Request) {
  let form: FormData

  try {
    form = await req.formData()
  } catch {
    return redirecteaza('ro', 'invalid')
  }

  const emailCodificat = String(form.get('e') ?? '')
  const ts = String(form.get('t') ?? '')
  const sig = String(form.get('s') ?? '')
  const lang: 'ro' | 'en' = form.get('lang') === 'en' ? 'en' : 'ro'
  const email = decodeazaEmail(emailCodificat)

  if (!verificaToken(email, ts, sig)) {
    return redirecteaza(lang, 'invalid')
  }

  try {
    const payload = await payloadClient()

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

    if (abonat.confirmat) {
      return redirecteazaLaLinkSemnat(lang, emailCodificat, ts, sig)
    }

    await payload.update({
      collection: 'newsletter',
      id: abonat.id,
      data: {
        confirmat: true,
      } as any,
    })

    return redirecteazaLaLinkSemnat(lang, emailCodificat, ts, sig)
  } catch {
    return redirecteaza(lang, 'invalid')
  }
}
