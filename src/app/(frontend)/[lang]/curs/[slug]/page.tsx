import { getCurs } from '@/lib/payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'
import LectiiAcordeon from './LectiiAcordeon'

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
        <LectiiAcordeon lectii={c.lectii} lang={lang} />
      ) : (
        <p style={{ color: '#888' }}>{lang === 'ro' ? 'Lecțiile acestui curs urmează să fie adăugate.' : 'Lessons for this course coming soon.'}</p>
      )}
    </article>
  )
}
