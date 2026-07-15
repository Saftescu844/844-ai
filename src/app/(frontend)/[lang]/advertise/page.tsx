export default async function PaginaAdvertise(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  return (
    <article style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>{lang === 'ro' ? 'Advertise' : 'Advertise'}</h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333' }}>
        {lang === 'ro'
          ? 'Vrei să ajungi la publicul nostru de profesioniști și pasionați de AI? Contactează-ne pentru oportunități de parteneriat și publicitate.'
          : 'Want to reach our audience of AI professionals and enthusiasts? Contact us for partnership and advertising opportunities.'}
      </p>
      <p style={{ fontSize: 16, marginTop: 8 }}><a href="mailto:advertise@844-ai.ro" style={{ color: '#185FA5' }}>advertise@844-ai.ro</a></p>
    </article>
  )
}
