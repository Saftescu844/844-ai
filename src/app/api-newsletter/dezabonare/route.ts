import { payloadClient } from '@/lib/payload'
import { verificaTokenDezabonare } from '@/lib/newsletter-email'

const SITE = (process.env.SITE_URL || 'https://844-ai.ro').replace(/\/+$/, '')

function redirecteaza(lang: 'ro' | 'en', rezultat: 'dezabonat' | 'invalid') {
  const url = new URL(`${SITE}/${lang}/dezabonare-newsletter`)
  url.searchParams.set('rezultat', rezultat)

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
  const sig = String(form.get('s') ?? '')
  const lang: 'ro' | 'en' = form.get('lang') === 'en' ? 'en' : 'ro'

  if (!id || !sig) {
    return redirecteaza(lang, 'invalid')
  }

  try {
    const payload = await payloadClient()

    const abonat = await payload.findByID({
      collection: 'newsletter',
      id,
    })

    if (!abonat || !verificaTokenDezabonare(id, abonat.email, sig)) {
      return redirecteaza(lang, 'invalid')
    }

    await payload.delete({
      collection: 'newsletter',
      id: abonat.id,
    })

    return redirecteaza(lang, 'dezabonat')
  } catch {
    return redirecteaza(lang, 'invalid')
  }
}
