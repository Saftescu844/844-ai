import { getCurs } from '@/lib/payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'

export default async function PaginaCurs(props: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await props.params
  const curs = await getCurs(slug, lang)
  if (!curs) notFound()
  const c: any = curs

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 0' }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: c.gratuit ? '#0F6E56' : '#B8860B' }}>
        {c.gratuit ? (lang === 'ro' ? 'Gratuit' : 'Free') : (lang === 'ro' ? 'Necesită abonament' : 'Requires subscription')}
      </span>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 16px' }}>{c.titlu}</h1>
      {c.descriere && (
        <div style={{ fontSize: 16, color: '#555', marginBottom: 32, lineHeight: 1.6 }}>
          <RichText data={c.descriere as any} />
        </div>
      )}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{lang === 'ro' ? 'Lecții' : 'Lessons'}</h2>
      {Array.isArray(c.lectii) && c.lectii.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {c.lectii.map((lectie: any, i: number) => (
            <div key={i} style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{i + 1}. {lectie.titlu}</h3>
                {lectie.durataMinute && <span style={{ fontSize: 12, color: '#888' }}>{lectie.durataMinute} min</span>}
              </div>
              {lectie.videoURL && (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, marginBottom: 10 }}>
                  <iframe src={lectie.videoURL} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen title={lectie.titlu} />
                </div>
              )}
              {lectie.continut && (
                <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
                  <RichText data={lectie.continut as any} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#888' }}>{lang === 'ro' ? 'Lecțiile acestui curs urmează să fie adăugate.' : 'Lessons for this course coming soon.'}</p>
      )}
    </article>
  )
}
