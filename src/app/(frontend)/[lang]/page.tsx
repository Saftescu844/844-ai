import { getArticole } from '@/lib/payload'

function eticheta(tip: string, lang: string) {
  if (tip === 'analiza') return lang === 'ro' ? 'Analiză' : 'Analysis'
  if (tip === 'frontiera') return lang === 'ro' ? 'Frontieră' : 'Frontier'
  return lang === 'ro' ? 'Știre' : 'News'
}

export default async function Homepage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  const { docs: articole } = await getArticole(lang, { limit: 15 })
  const txt = lang === 'ro'
    ? { titlu: 'Ultimele articole', gol: 'Încă nu sunt articole publicate.' }
    : { titlu: 'Latest articles', gol: 'No articles published yet.' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{txt.titlu}</h1>
      {articole.length === 0 ? (
        <p style={{ color: '#888' }}>{txt.gol}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {articole.map((a: any) => (
            <a key={a.id} href={`/${lang}/articol/${a.slug}`}
               style={{ textDecoration: 'none', color: 'inherit', border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, display: 'block' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#185FA5' }}>
                {eticheta(a.tip, lang)}
              </span>
              <h2 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, margin: '6px 0' }}>{a.titlu}</h2>
              {a.excerpt && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{a.excerpt.length > 110 ? a.excerpt.slice(0, 110) + '…' : a.excerpt}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
