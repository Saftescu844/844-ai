import { payloadClient } from '@/lib/payload'
import { verificaTokenDezabonare } from '@/lib/newsletter-email'

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

type Stare = 'valid' | 'invalid' | 'inexistent'

async function verificaAbonament(id: string, sig: string): Promise<Stare> {
  if (!id || !sig) return 'invalid'

  const payload = await payloadClient()

  try {
    const abonat = await payload.findByID({
      collection: 'newsletter',
      id,
    })

    if (!abonat) return 'inexistent'
    if (!verificaTokenDezabonare(id, abonat.email, sig)) return 'invalid'

    return 'valid'
  } catch {
    return 'inexistent'
  }
}

export default async function PaginaDezabonare(props: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ i?: string; s?: string; rezultat?: string }>
}) {
  const { lang } = await props.params
  const q = await props.searchParams
  const ro = lang !== 'en'

  if (q.rezultat === 'dezabonat') {
    return (
      <article style={s.wrap}>
        <div style={s.icon}>✓</div>
        <h1 style={s.h1}>
          {ro ? 'Dezabonare finalizată' : 'Unsubscription complete'}
        </h1>
        <p style={s.p}>
          {ro
            ? 'Adresa ta a fost eliminată din lista newsletterului.'
            : 'Your address has been removed from the newsletter list.'}
        </p>
        <p style={{ ...s.p, marginTop: 26 }}>
          <a href={`/${ro ? 'ro' : 'en'}`} style={s.link}>
            {ro ? '← Înapoi la 844-ai.ro' : '← Back to 844-ai.ro'}
          </a>
        </p>
      </article>
    )
  }

  const id = q.i || ''
  const sig = q.s || ''

  const stare = await verificaAbonament(id, sig)

  if (stare !== 'valid') {
    return (
      <article style={s.wrap}>
        <div style={s.icon}>⚠️</div>
        <h1 style={s.h1}>
          {ro ? 'Link de dezabonare invalid' : 'Invalid unsubscribe link'}
        </h1>
        <p style={s.p}>
          {ro
            ? 'Linkul nu este valid sau abonamentul nu mai există.'
            : 'This link is invalid or the subscription no longer exists.'}
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
      <h1 style={s.h1}>{ro ? 'Confirmă dezabonarea' : 'Confirm unsubscribe'}</h1>
      <p style={s.p}>
        {ro
          ? 'Apasă butonul de mai jos pentru a opri newsletterul trimis la această adresă.'
          : 'Use the button below to stop newsletter emails sent to this address.'}
      </p>

      <form method="post" action="/api-newsletter/dezabonare">
        <input type="hidden" name="i" value={id} />
        <input type="hidden" name="s" value={sig} />
        <input type="hidden" name="lang" value={ro ? 'ro' : 'en'} />

        <button type="submit" style={s.button}>
          {ro ? 'Dezabonează-mă' : 'Unsubscribe me'}
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
