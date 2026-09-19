import Link from 'next/link'

import PasswordRecoveryForm from '@/components/PasswordRecoveryForm'

export const dynamic = 'force-dynamic'

export default async function RecuperareParolaPage(props: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await props.params
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
          {ro
            ? 'Recuperează parola'
            : 'Recover your password'}
        </h1>

        <p
          style={{
            margin: '0 0 22px',
            lineHeight: 1.6,
            color: '#555',
          }}
        >
          {ro
            ? 'Introdu adresa de email asociată contului. Dacă există un cont pentru această adresă, vei primi un link de resetare valabil o oră.'
            : 'Enter the email address associated with your account. If an account exists for this address, you will receive a reset link valid for one hour.'}
        </p>

        <PasswordRecoveryForm
          lang={ro ? 'ro' : 'en'}
        />

        <p
          style={{
            margin: '20px 0 0',
            fontSize: 14,
          }}
        >
          <Link
            href={`/${ro ? 'ro' : 'en'}`}
            style={{
              color: '#185FA5',
            }}
          >
            {ro
              ? 'Înapoi la 844-ai.ro'
              : 'Back to 844-ai.ro'}
          </Link>
        </p>
      </div>
    </main>
  )
}
