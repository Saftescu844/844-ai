import React from 'react'
import NewsletterForm from '@/components/NewsletterForm'

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
          <a href={`/${lang}`} style={{ textDecoration: 'none', color: '#1a1a1a', lineHeight: 1.2 }}>
            <div style={{ fontSize: 19, fontWeight: 700 }}><span style={{ color: '#C41E3A' }}>844-ai</span><span style={{ color: '#1a1a1a' }}>.ro</span></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>{lang === 'ro' ? 'Tot ce contează în AI, într-un singur loc.' : 'Everything that matters in AI, in one place.'}</div>
          </a>
          <nav style={{ display: 'flex', gap: 4 }}>
            <a href="/ro" style={{ padding: '3px 9px', borderRadius: 6, textDecoration: 'none', color: lang === 'ro' ? '#185FA5' : '#999', fontWeight: lang === 'ro' ? 600 : 400, fontSize: 14 }}>RO</a>
            <a href="/en" style={{ padding: '3px 9px', borderRadius: 6, textDecoration: 'none', color: lang === 'en' ? '#185FA5' : '#999', fontWeight: lang === 'en' ? 600 : 400, fontSize: 14 }}>EN</a>
          </nav>
        </div>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingBottom: 4 }}>
          {PILONI.map((p) => (
            <a key={p.slug} href={`/${lang}/pilon/${p.slug}`} className="menu-pilon"
               style={{ textDecoration: 'none', color: '#185FA5', fontSize: 14, fontWeight: 500 }}>
              {lang === 'ro' ? p.ro : p.en}
            </a>
          ))}
        </nav>
      </header>
      <main style={{ paddingTop: 10 }}>{props.children}</main>
      <footer style={{ borderTop: '1px solid #e5e5e5', padding: '2rem 0 1.5rem', marginTop: 40, fontSize: 13, color: '#666' }}>
        <div style={{ marginBottom: 24, maxWidth: 480 }}>
          <NewsletterForm lang={lang} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}><span style={{ color: '#C41E3A' }}>844-ai</span>.ro</div>
            <div style={{ color: '#999', maxWidth: 260 }}>{lang === 'ro' ? 'Tot ce contează în AI, într-un singur loc.' : 'Everything that matters in AI, in one place.'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#333' }}>{lang === 'ro' ? 'Companie' : 'Company'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={`/${lang}/despre`} style={{ color: '#666', textDecoration: 'none' }}>{lang === 'ro' ? 'Despre noi' : 'About us'}</a>
              <a href={`/${lang}/contact`} style={{ color: '#666', textDecoration: 'none' }}>Contact</a>
              <a href={`/${lang}/advertise`} style={{ color: '#666', textDecoration: 'none' }}>Advertise</a>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: 14, textAlign: 'center', color: '#999' }}>
          © 2026 844-ai.ro — {lang === 'ro' ? 'Toate drepturile rezervate' : 'All rights reserved'}
        </div>
      </footer>
    </div>
  )
}
