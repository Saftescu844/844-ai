import { payloadClient } from '@/lib/payload'
import { verificaToken, decodeazaEmail } from '@/lib/newsletter-email'

const s = {
  wrap: { maxWidth: 620, margin: '0 auto', padding: '3rem 0', textAlign: 'center' as const },
  h1: { fontSize: 26, fontWeight: 700, margin: '0 0 12px' },
  p: { fontSize: 16, lineHeight: 1.7, color: '#444', margin: '0 0 10px' },
  icon: { fontSize: 44, marginBottom: 10 },
  button: {
    marginTop: 20,
    padding: '11px 20px',
    background: '#185FA5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  link: { color: '#185FA5', fontWeight: 600, textDecoration: 'none' },
}

type Stare = 'valid' | 'deja' | 'invalid' | 'inexistent'

async function verificaAbonament(email: string, ts: string, sig: string): Promise<Stare> {
  if (!verificaToken(email, ts, sig)) return 'invalid'

  const payload = await payloadClient()

  const gasit = await payload.find({
    collection: 'newsletter',
    where: { email: { equals: email } },
    limit: 1,
  })

  const abonat = gasit.docs[0]

  if (!abonat) return 'inexistent'
  if (abonat.confirmat) return 'deja'

  return 'valid'
}

export default async function PaginaConfirmare(props: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ e?: string; t?: string; s?: string; rezultat?: string }>
}) {
  const { lang } = await props.params
  const q = await props.searchParams
  const ro = lang !== 'en'

  if (q.rezultat === 'invalid' || q.rezultat === 'inexistent') {
    const inexistent = q.rezultat === 'inexistent'

    return (
      <article style={s.wrap}>
        <div style={s.icon}>⚠️</div>
        <h1 style={s.h1}>
          {inexistent
            ? ro
              ? 'Abonare inexistentă'
              : 'Subscription not found'
            : ro
              ? 'Link invalid sau expirat'
              : 'Invalid or expired link'}
        </h1>
        <p style={s.p}>
          {inexistent
            ? ro
              ? 'Nu am găsit această adresă în lista de abonați.'
              : 'We could not find this address in our subscriber list.'
            : ro
              ? 'Linkul de confirmare nu este valid sau a expirat (valabilitate: 7 zile).'
              : 'This confirmation link is not valid or has expired (valid for 7 days).'}
        </p>
        <p style={{ ...s.p, marginTop: 26 }}>
          <a href={`/${ro ? 'ro' : 'en'}`} style={s.link}>
            {ro ? '← Înapoi la 844-ai.ro' : '← Back to 844-ai.ro'}
          </a>
        </p>
      </article>
    )
  }

  const emailCodificat = q.e || ''
  const email = decodeazaEmail(emailCodificat)
  const ts = q.t || ''
  const sig = q.s || ''

  let stare: Stare = 'invalid'

  try {
    stare = await verificaAbonament(email, ts, sig)
  } catch {
    stare = 'invalid'
  }

  if (stare === 'deja') {
    return (
      <article style={s.wrap}>
        <div style={s.icon}>✓</div>
        <h1 style={s.h1}>{ro ? 'Deja confirmat' : 'Already confirmed'}</h1>
        <p style={s.p}>
          {ro
            ? 'Adresa ta era deja confirmată. Nu e nevoie de nimic altceva.'
            : 'Your address was already confirmed. Nothing further is needed.'}
        </p>
        <p style={{ ...s.p, marginTop: 26 }}>
          <a href={`/${ro ? 'ro' : 'en'}`} style={s.link}>
            {ro ? '← Înapoi la 844-ai.ro' : '← Back to 844-ai.ro'}
          </a>
        </p>
      </article>
    )
  }

  if (stare !== 'valid') {
    const inexistent = stare === 'inexistent'

    return (
      <article style={s.wrap}>
        <div style={s.icon}>⚠️</div>
        <h1 style={s.h1}>
          {inexistent
            ? ro
              ? 'Abonare inexistentă'
              : 'Subscription not found'
            : ro
              ? 'Link invalid sau expirat'
              : 'Invalid or expired link'}
        </h1>
        <p style={s.p}>
          {inexistent
            ? ro
              ? 'Nu am găsit această adresă în lista de abonați.'
              : 'We could not find this address in our subscriber list.'
            : ro
              ? 'Linkul de confirmare nu este valid sau a expirat (valabilitate: 7 zile).'
              : 'This confirmation link is not valid or has expired (valid for 7 days).'}
        </p>
        <p style={{ ...s.p, marginTop: 26 }}>
          <a href={`/${ro ? 'ro' : 'en'}`} style={s.link}>
            {ro ? '← Înapoi la 844-ai.ro' : '← Back to 844-ai.ro'}
          </a>
        </p>
      </article>
    )
  }

  return (
    <article style={s.wrap}>
      <div style={s.icon}>✉️</div>
      <h1 style={s.h1}>{ro ? 'Confirmă abonarea' : 'Confirm subscription'}</h1>
      <p style={s.p}>
        {ro
          ? 'Apasă butonul de mai jos pentru a confirma abonarea la newsletterul 844-ai.ro.'
          : 'Use the button below to confirm your subscription to the 844-ai.ro newsletter.'}
      </p>

      <form method="post" action="/api-newsletter/confirmare">
        <input type="hidden" name="e" value={emailCodificat} />
        <input type="hidden" name="t" value={ts} />
        <input type="hidden" name="s" value={sig} />
        <input type="hidden" name="lang" value={ro ? 'ro' : 'en'} />

        <button type="submit" style={s.button}>
          {ro ? 'Confirmă abonarea' : 'Confirm subscription'}
        </button>
      </form>

      <p style={{ ...s.p, marginTop: 26 }}>
        <a href={`/${ro ? 'ro' : 'en'}`} style={s.link}>
          {ro ? 'Renunță și întoarce-te pe site' : 'Cancel and return to the site'}
        </a>
      </p>
    </article>
  )
}
