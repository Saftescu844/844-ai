import Link from 'next/link'

import { payloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

type StareConfirmare =
  | 'confirmat'
  | 'invalid'

async function confirmaCont(
  token: string,
): Promise<StareConfirmare> {
  if (!token) {
    return 'invalid'
  }

  try {
    const payload = await payloadClient()

    await payload.verifyEmail({
      collection: 'useri',
      token,
    })

    return 'confirmat'
  } catch (eroare) {
    console.error('[confirmare-cont] token invalid sau expirat:', eroare)
    return 'invalid'
  }
}

export default async function ConfirmareContPage(props: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{
    token?: string | string[]
  }>
}) {
  const { lang } = await props.params
  const searchParams = await props.searchParams
  const rawToken = searchParams.token
  const token =
    typeof rawToken === 'string'
      ? rawToken
      : ''

  const stare = await confirmaCont(token)
  const ro = lang !== 'en'

  return (
    <main
      style={{
        maxWidth: 620,
        margin: '0 auto',
        padding: '4rem 1rem',
      }}
    >
      <div
        style={{
          border: '1px solid #e5e5e5',
          borderRadius: 12,
          padding: '28px 30px',
          background: '#fff',
        }}
      >
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: 28,
          }}
        >
          {stare === 'confirmat'
            ? ro
              ? 'Cont confirmat'
              : 'Account confirmed'
            : ro
              ? 'Link invalid sau expirat'
              : 'Invalid or expired link'}
        </h1>

        <p
          style={{
            margin: '0 0 22px',
            lineHeight: 1.6,
            color: '#555',
          }}
        >
          {stare === 'confirmat'
            ? ro
              ? 'Adresa ta de email a fost confirmată. Te poți autentifica acum și poți participa la discuții.'
              : 'Your email address has been confirmed. You can now sign in and join the discussion.'
            : ro
              ? 'Nu am putut confirma contul folosind acest link. Poate fi deja folosit sau nu mai este valid.'
              : 'We could not confirm the account with this link. It may have already been used or is no longer valid.'}
        </p>

        <Link
          href={`/${ro ? 'ro' : 'en'}`}
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            borderRadius: 8,
            background: '#185FA5',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {ro
            ? 'Înapoi la 844-ai.ro'
            : 'Back to 844-ai.ro'}
        </Link>
      </div>
    </main>
  )
}
