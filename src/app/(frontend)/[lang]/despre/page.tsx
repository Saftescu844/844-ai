export default async function PaginaDespre(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  return (
    <article style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>{lang === 'ro' ? 'Despre 844-ai.ro' : 'About 844-ai.ro'}</h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333' }}>
        {lang === 'ro'
          ? '844-ai.ro este o platformă românească de referință dedicată inteligenței artificiale — știri verificate, analize, resurse educaționale și un director de unelte AI, pentru un public divers: ingineri, studenți, medici, profesori și publicul larg.'
          : '844-ai.ro is a Romanian reference platform dedicated to artificial intelligence — verified news, analysis, educational resources, and an AI tool directory, for a diverse audience: engineers, students, doctors, teachers, and the general public.'}
      </p>
    </article>
  )
}
