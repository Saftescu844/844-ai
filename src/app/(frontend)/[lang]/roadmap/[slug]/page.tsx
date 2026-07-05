import { getRoadmap } from '@/lib/payload'
import { notFound } from 'next/navigation'
import PasiAcordeon from './PasiAcordeon'

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

      {Array.isArray(r.pasi) && r.pasi.length > 0 ? (
        <PasiAcordeon pasi={r.pasi} />
      ) : (
        <p style={{ color: '#888' }}>{lang === 'ro' ? 'Pașii acestui roadmap urmează să fie adăugați.' : 'Steps for this roadmap coming soon.'}</p>
      )}
    </article>
  )
}
