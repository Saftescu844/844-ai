import { payloadClient } from '@/lib/payload'
import { verificaToken } from '@/lib/newsletter-email'

const s = {
  wrap: { maxWidth: 620, margin: '0 auto', padding: '3rem 0', textAlign: 'center' as const },
  h1: { fontSize: 26, fontWeight: 700, margin: '0 0 12px' },
  p: { fontSize: 16, lineHeight: 1.7, color: '#444', margin: '0 0 10px' },
  ok: { fontSize: 44, marginBottom: 10 },
  link: { color: '#185FA5', fontWeight: 600, textDecoration: 'none' },
}

type Stare = 'confirmat' | 'deja' | 'invalid' | 'inexistent'

async function proceseaza(email: string, ts: string, sig: string): Promise<Stare> {
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

  await payload.update({
    collection: 'newsletter',
    id: abonat.id,
    data: { confirmat: true } as any,
  })
  return 'confirmat'
}

export default async function PaginaConfirmare(props: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ e?: string; t?: string; s?: string }>
}) {
  const { lang } = await props.params
  const q = await props.searchParams
  const ro = lang !== 'en'

  let stare: Stare = 'invalid'
  try {
    stare = await proceseaza(q.e || '', q.t || '', q.s || '')
  } catch {
    stare = 'invalid'
  }

  const txt = {
    confirmat: ro
      ? {
          t: 'Abonare confirmată',
          p: 'Mulțumim! De acum primești newsletterul 844-ai.ro cu cele mai importante noutăți din AI.',
        }
      : {
          t: 'Subscription confirmed',
          p: 'Thank you! You will now receive the 844-ai.ro newsletter with the most important AI news.',
        },
    deja: ro
      ? { t: 'Deja confirmat', p: 'Adresa ta era deja confirmată. Nu e nevoie de nimic altceva.' }
      : {
          t: 'Already confirmed',
          p: 'Your address was already confirmed. Nothing further is needed.',
        },
    invalid: ro
      ? {
          t: 'Link invalid sau expirat',
          p: 'Linkul de confirmare nu este valid sau a expirat (valabilitate: 7 zile). Te poți abona din nou de la finalul oricărui articol.',
        }
      : {
          t: 'Invalid or expired link',
          p: 'This confirmation link is not valid or has expired (valid for 7 days). You can subscribe again at the end of any article.',
        },
    inexistent: ro
      ? {
          t: 'Abonare inexistentă',
          p: 'Nu am găsit această adresă în lista de abonați. Te poți abona de la finalul oricărui articol.',
        }
      : {
          t: 'Subscription not found',
          p: 'We could not find this address in our subscriber list. You can subscribe at the end of any article.',
        },
  }[stare]

  const reusit = stare === 'confirmat' || stare === 'deja'

  return (
    <article style={s.wrap}>
      <div style={s.ok}>{reusit ? '✓' : '⚠️'}</div>
      <h1 style={s.h1}>{txt.t}</h1>
      <p style={s.p}>{txt.p}</p>
      <p style={{ ...s.p, marginTop: 26 }}>
        <a href={`/${ro ? 'ro' : 'en'}`} style={s.link}>
          {ro ? '← Înapoi la 844-ai.ro' : '← Back to 844-ai.ro'}
        </a>
      </p>
    </article>
  )
}
