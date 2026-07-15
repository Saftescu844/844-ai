export default async function PaginaContact(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  return (
    <article style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>{lang === 'ro' ? 'Contact' : 'Contact'}</h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333' }}>
        {lang === 'ro'
          ? 'Pentru întrebări, sugestii sau colaborări, ne poți scrie la:'
          : 'For questions, suggestions, or partnerships, write to us at:'}
      </p>
      <p style={{ fontSize: 16, marginTop: 8 }}><a href="mailto:contact@844-ai.ro" style={{ color: '#185FA5' }}>contact@844-ai.ro</a></p>
    </article>
  )
}
