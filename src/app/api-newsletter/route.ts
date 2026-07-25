import { payloadClient } from '@/lib/payload'
import { trimiteConfirmare } from '@/lib/newsletter-email'

export async function POST(req: Request) {
  const raspuns = (date: object, status: number) =>
    new Response(JSON.stringify(date), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  let email = ''
  let limba = 'ro'

  try {
    const body = await req.json()
    email = String(body.email || '')
      .trim()
      .toLowerCase()
    limba = body.limba === 'en' ? 'en' : 'ro'
  } catch {
    return raspuns({ eroare: 'cerere_invalida' }, 400)
  }

  if (!email || !email.includes('@') || email.length > 200) {
    return raspuns({ eroare: 'email_invalid' }, 400)
  }

  let payload
  try {
    payload = await payloadClient()
  } catch (e) {
    console.error('[newsletter] eroare conectare Payload:', String(e))
    return raspuns({ eroare: 'eroare_server' }, 500)
  }

  // există deja?
  try {
    const existent = await payload.find({
      collection: 'newsletter',
      where: { email: { equals: email } },
      limit: 1,
    })
    if (existent.docs.length > 0) {
      return raspuns({ eroare: 'deja_abonat' }, 409)
    }
  } catch (e) {
    console.error('[newsletter] eroare verificare existenta:', String(e))
    return raspuns({ eroare: 'eroare_server' }, 500)
  }

  // creează abonatul
  try {
    await payload.create({
      collection: 'newsletter',
      data: { email, limba, segment: ['general'], confirmat: false } as any,
    })
  } catch (e) {
    console.error('[newsletter] eroare creare abonat:', String(e))
    return raspuns({ eroare: 'eroare_creare' }, 500)
  }

  // trimite email de confirmare — abonatul e deja salvat, deci un eșec aici nu-l pierde
  let emailTrimis = true
  let detaliuEmail = ''
  try {
    await trimiteConfirmare(email, limba)
  } catch (e) {
    emailTrimis = false
    detaliuEmail = String(e)
    console.error('[newsletter] eroare trimitere email:', detaliuEmail)
  }

  return raspuns({ ok: true, emailTrimis, detaliuEmail }, 201)
}
