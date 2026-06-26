import React from 'react'

const PILONI = [
  { slug: 'stiri', ro: 'Știri AI', en: 'AI News' },
  { slug: 'sanatate', ro: 'Sănătate', en: 'Health' },
  { slug: 'educatie', ro: 'Educație', en: 'Education' },
  { slug: 'tools', ro: 'Tool Directory', en: 'Tools' },
  { slug: 'afaceri', ro: 'Afaceri', en: 'Business' },
]

export default async function LangLayout(props: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await props.params
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, paddingBottom: 10 }}>
          <a href={`/${lang}`} style={{ fontSize: 19, fontWeight: 700, textDecoration: 'none', color: '#1a1a1a' }}>844-ai.ro</a>
          <nav style={{ display: 'flex', gap: 4 }}>
            <a href="/ro" style={{ padding: '3px 9px', borderRadius: 6, textDecoration: 'none', color: lang === 'ro' ? '#185FA5' : '#999', fontWeight: lang === 'ro' ? 600 : 400, fontSize: 14 }}>RO</a>
            <a href="/en" style={{ padding: '3px 9px', borderRadius: 6, textDecoration: 'none', color: lang === 'en' ? '#185FA5' : '#999', fontWeight: lang === 'en' ? 600 : 400, fontSize: 14 }}>EN</a>
          </nav>
        </div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingBottom: 4 }}>
          {PILONI.map((p) => (
            <a key={p.slug} href={`/${lang}/pilon/${p.slug}`}
               style={{ textDecoration: 'none', color: '#444', fontSize: 14, fontWeight: 500 }}>
              {lang === 'ro' ? p.ro : p.en}
            </a>
          ))}
        </nav>
      </header>
      <main style={{ paddingTop: 20 }}>{props.children}</main>
      <footer style={{ borderTop: '1px solid #e5e5e5', padding: '1.5rem 0', marginTop: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
        844-ai.ro — {lang === 'ro' ? 'Platformă românească de referință pentru AI' : 'Romanian reference platform for AI'}
      </footer>
    </div>
  )
}
