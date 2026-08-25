import { payloadClient } from '@/lib/payload'
import { verificaTokenDezabonare } from '@/lib/newsletter-email'

function redirecteaza(req: Request, lang: 'ro' | 'en', rezultat: 'dezabonat' | 'invalid') {
  const url = new URL(`/${lang}/dezabonare-newsletter`, req.url)
  url.searchParams.set('rezultat', rezultat)

  return Response.redirect(url, 303)
}

export async function POST(req: Request) {
  let form: FormData

  try {
    form = await req.formData()
  } catch {
    return redirecteaza(req, 'ro', 'invalid')
  }

  const id = String(form.get('i') ?? '')
  const sig = String(form.get('s') ?? '')
  const lang: 'ro' | 'en' = form.get('lang') === 'en' ? 'en' : 'ro'

  if (!id || !sig) {
    return redirecteaza(req, lang, 'invalid')
  }

  try {
    const payload = await payloadClient()

    const abonat = await payload.findByID({
      collection: 'newsletter',
      id,
    })

    if (!abonat || !verificaTokenDezabonare(id, abonat.email, sig)) {
      return redirecteaza(req, lang, 'invalid')
    }

    await payload.delete({
      collection: 'newsletter',
      id: abonat.id,
    })

    return redirecteaza(req, lang, 'dezabonat')
  } catch {
    return redirecteaza(req, lang, 'invalid')
  }
}
