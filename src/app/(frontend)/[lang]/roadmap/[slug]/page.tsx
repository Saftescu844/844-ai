import { getRoadmap } from '@/lib/payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'

const NIVEL: Record<string, { ro: string; en: string }> = {
  incepator: { ro: 'Începător', en: 'Beginner' },
  intermediar: { ro: 'Intermediar', en: 'Intermediate' },
  avansat: { ro: 'Avansat', en: 'Advanced' },
}

export default async function PaginaRoadmap(props: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await props.params
  const roadmap = await getRoadmap(slug, lang)
  if (!roadmap) notFound()
  const r: any = roadmap

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 0' }}>
      {r.nivel && NIVEL[r.nivel] && (
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#185FA5' }}>
          {lang === 'ro' ? NIVEL[r.nivel].ro : NIVEL[r.nivel].en}
        </span>
      )}
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 12px' }}>{r.titlu}</h1>
      {r.descriere && <p style={{ fontSize: 16, color: '#555', marginBottom: 32, lineHeight: 1.6 }}>{r.descriere}</p>}

      {Array.isArray(r.pasi) && r.pasi.map((pas: any, i: number) => (
        <div key={i} style={{ marginBottom: 28, paddingLeft: 20, borderLeft: '3px solid #185FA5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#185FA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>{pas.titlu}</h2>
          </div>
          {pas.descriere && (
            <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333', marginBottom: 10 }}>
              <RichText data={pas.descriere as any} />
            </div>
          )}
          {Array.isArray(pas.resurse) && pas.resurse.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pas.resurse.map((res: any, j: number) => (
                <a key={j} href={res.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#185FA5', textDecoration: 'none' }}>
                  📎 {res.titlu || res.url}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}

      {(!Array.isArray(r.pasi) || r.pasi.length === 0) && (
        <p style={{ color: '#888' }}>{lang === 'ro' ? 'Pașii acestui roadmap urmează să fie adăugați.' : 'Steps for this roadmap coming soon.'}</p>
      )}
    </article>
  )
}
