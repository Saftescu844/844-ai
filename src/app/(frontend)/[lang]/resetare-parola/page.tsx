import PasswordResetForm from '@/components/PasswordResetForm'

export const dynamic = 'force-dynamic'

export default async function ResetareParolaPage(props: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{
    token?: string | string[]
  }>
}) {
  const { lang } = await props.params
  const searchParams =
    await props.searchParams

  const rawToken =
    searchParams.token

  const token =
    typeof rawToken === 'string'
      ? rawToken
      : ''

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
            ? 'Setează o parolă nouă'
            : 'Set a new password'}
        </h1>

        <p
          style={{
            margin: '0 0 22px',
            lineHeight: 1.6,
            color: '#555',
          }}
        >
          {ro
            ? 'Alege o parolă nouă pentru contul tău 844-ai.ro.'
            : 'Choose a new password for your 844-ai.ro account.'}
        </p>

        <PasswordResetForm
          lang={ro ? 'ro' : 'en'}
          token={token}
        />
      </div>
    </main>
  )
}
