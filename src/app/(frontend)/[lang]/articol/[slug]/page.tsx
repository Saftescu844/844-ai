import { getArticol } from '@/lib/payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'

export default async function PaginaArticol(props: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await props.params
  const articol = await getArticol(slug, lang)
  if (!articol) notFound()

  const data = articol.publishedAt
    ? new Intl.DateTimeFormat(lang === 'ro' ? 'ro-RO' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(articol.publishedAt))
    : ''
  const eticheta = articol.tip === 'analiza' ? (lang === 'ro' ? 'Analiză' : 'Analysis')
    : articol.tip === 'frontiera' ? (lang === 'ro' ? 'Frontieră' : 'Frontier')
    : (lang === 'ro' ? 'Știre' : 'News')

  const pilonSlug = articol.pilon && typeof articol.pilon === 'object' ? articol.pilon.slug : ''
  const esteSanatate = pilonSlug === 'sanatate'
  const txtDisclaimer = lang === 'ro'
    ? 'Acest articol are scop informativ și jurnalistic. Nu constituie sfat medical. Pentru probleme de sănătate, consultă un medic.'
    : 'This article is for informational and journalistic purposes only. It does not constitute medical advice. For health concerns, consult a physician.'

  // versiunea în cealaltă limbă (pentru comutator pe articol)
  const altObj = articol.versiuneAlternativa && typeof articol.versiuneAlternativa === 'object' ? articol.versiuneAlternativa : null
  const altLimba = lang === 'ro' ? 'en' : 'ro'
  const altLink = altObj && altObj.slug ? '/' + altObj.limba + '/articol/' + altObj.slug : '/' + altLimba
  const txtComutator = lang === 'ro' ? 'Read in English →' : '← Citește în română'

  const txtSursa = lang === 'ro' ? 'Sursă' : 'Source'
  const txtNota = lang === 'ro'
    ? '844-ai.ro raportează pe baza sursei de mai sus. Articol sintetizat editorial, cu atribuire.'
    : '844-ai.ro reports based on the source above. Editorially synthesized article, with attribution.'

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#185FA5' }}>{eticheta}</span>
        <a href={altLink} style={{ fontSize: 13, color: '#185FA5', textDecoration: 'none', fontWeight: 500 }}>{txtComutator}</a>
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.2, margin: '10px 0 12px' }}>{articol.titlu}</h1>
      {data && <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>{data}</p>}
      {esteSanatate && (
        <div style={{ marginBottom: 24, padding: '14px 18px', background: '#FCF3E8', border: '1px solid #E8C99B', borderRadius: 10, fontSize: 14, color: '#7A5A1E' }}>
          ⚕️ {txtDisclaimer}
        </div>
      )}
      <div style={{ fontSize: 17, lineHeight: 1.7, color: '#222' }}>
        <RichText data={articol.continut as any} />
      </div>

      {articol.sursaNume && (
        <div style={{ marginTop: 36, padding: '18px 20px', background: '#f6f6f4', borderRadius: 10, fontSize: 14 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1a1a1a' }}>{txtSursa}</p>
          {articol.sursaLink ? (
            <a href={articol.sursaLink} target="_blank" rel="noopener noreferrer"
               style={{ color: '#185FA5', textDecoration: 'none', fontWeight: 500 }}>
              {articol.sursaNume} →
            </a>
          ) : (
            <span style={{ color: '#444' }}>{articol.sursaNume}</span>
          )}
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#888', fontStyle: 'italic' }}>{txtNota}</p>
        </div>
      )}
    </article>
  )
}
