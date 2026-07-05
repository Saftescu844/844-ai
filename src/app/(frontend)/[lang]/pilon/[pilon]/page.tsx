import { getTooluri, getArticolePilon, getArticoleSanatate, getArticoleEducatie, getRoadmaps, getCursuri } from '@/lib/payload'
import { notFound } from 'next/navigation'

const PILONI: Record<string, { ro: string; en: string }> = {
  stiri: { ro: 'Știri AI', en: 'AI News' },
  sanatate: { ro: 'Sănătate și medicină', en: 'Health & Medicine' },
  educatie: { ro: 'Educație', en: 'Education' },
  tools: { ro: 'Tool Directory', en: 'Tool Directory' },
  afaceri: { ro: 'Afaceri și productivitate', en: 'Business & Productivity' },
}

const PRET: Record<string, { ro: string; en: string }> = {
  gratuit: { ro: 'Gratuit', en: 'Free' },
  freemium: { ro: 'Freemium', en: 'Freemium' },
  platit: { ro: 'Plătit', en: 'Paid' },
}

function CardArticol({ a, lang }: { a: any; lang: string }) {
  const et = a.tip === 'analiza' ? (lang === 'ro' ? 'Analiză' : 'Analysis') : a.tip === 'frontiera' ? (lang === 'ro' ? 'Frontieră' : 'Frontier') : (lang === 'ro' ? 'Știre' : 'News')
  return (
    <a href={`/${lang}/articol/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, display: 'block' }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#185FA5' }}>{et}</span>
      <h2 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, margin: '6px 0' }}>{a.titlu}</h2>
      {a.excerpt && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{a.excerpt.length > 110 ? a.excerpt.slice(0, 110) + '…' : a.excerpt}</p>}
    </a>
  )
}

export default async function PaginaPilon(props: { params: Promise<{ lang: string; pilon: string }>; searchParams: Promise<{ sub?: string }> }) {
  const { lang, pilon } = await props.params
  if (!PILONI[pilon]) notFound()
  const info = PILONI[pilon]
  const titluPilon = lang === 'ro' ? info.ro : info.en

  // pentru Tool Directory: catalog + articole
  // SĂNĂTATE: submeniuri pe subcategorii
  if (pilon === 'sanatate') {
    const { sub } = await props.searchParams
    const { docs: articole } = await getArticoleSanatate(lang, sub)
    const SUBMENIURI = [
      { slug: '', ro: 'Toate', en: 'All' },
      { slug: 'diagnostic', ro: 'Diagnostic și imagistică', en: 'Diagnostics & Imaging' },
      { slug: 'medicamente', ro: 'Medicamente', en: 'Drug Discovery' },
      { slug: 'asistenta-clinica', ro: 'Asistență clinică', en: 'Clinical Support' },
      { slug: 'reglementare', ro: 'Reglementare și etică', en: 'Regulation & Ethics' },
      { slug: 'pacienti', ro: 'AI pentru pacienți', en: 'AI for Patients' },
    ]
    const disclaimerTxt = lang === 'ro'
      ? 'Conținut jurnalistic și informativ. Nu constituie sfat medical. Pentru probleme de sănătate, consultă un medic.'
      : 'Journalistic and informational content. Not medical advice. For health concerns, consult a physician.'
    return (
      <div style={{ padding: '0.5rem 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{lang === 'ro' ? info.ro : info.en}</h1>
        <p style={{ fontSize: 12, color: '#7A5A1E', background: '#FCF3E8', border: '1px solid #E8C99B', borderRadius: 8, padding: '10px 14px', marginBottom: 20, lineHeight: 1.5 }}>⚕️ {disclaimerTxt}</p>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {SUBMENIURI.map((s) => {
            const activ = (sub || '') === s.slug
            const href = s.slug ? `/${lang}/pilon/sanatate?sub=${s.slug}` : `/${lang}/pilon/sanatate`
            return (
              <a key={s.slug || 'toate'} href={href} style={{ padding: '6px 14px', borderRadius: 20, textDecoration: 'none', fontSize: 13, fontWeight: 500, border: '1px solid ' + (activ ? 'transparent' : '#d4d4d4'), background: activ ? '#185FA5' : 'transparent', color: activ ? '#fff' : '#444' }}>
                {lang === 'ro' ? s.ro : s.en}
              </a>
            )
          })}
        </nav>
        {articole.length === 0 ? (
          <p style={{ color: '#888' }}>{lang === 'ro' ? 'Încă nu sunt articole în această secțiune.' : 'No articles in this section yet.'}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {articole.map((a: any) => <CardArticol key={a.id} a={a} lang={lang} />)}
          </div>
        )}
      </div>
    )
  }

  // EDUCAȚIE: submeniuri pe subcategorii
  if (pilon === 'educatie') {
    const { sub } = await props.searchParams
    const { docs: articole } = await getArticoleEducatie(lang, sub)
    const { docs: roadmaps } = await getRoadmaps(lang)
    const { docs: cursuri } = await getCursuri(lang)
    const SUBMENIURI = [
      { slug: '', ro: 'Toate', en: 'All' },
      { slug: 'invatare-ai', ro: 'Învățare AI', en: 'Learning AI' },
      { slug: 'institutii', ro: 'AI în școli și universități', en: 'AI in Schools & Universities' },
      { slug: 'instrumente-edu', ro: 'Instrumente educaționale AI', en: 'AI Education Tools' },
      { slug: 'cercetare', ro: 'Cercetare și inovație', en: 'Research & Innovation' },
      { slug: 'cariere', ro: 'Cariere în AI', en: 'AI Careers' },
    ]
    const NIVEL: Record<string, { ro: string; en: string }> = {
      incepator: { ro: 'Începător', en: 'Beginner' },
      intermediar: { ro: 'Intermediar', en: 'Intermediate' },
      avansat: { ro: 'Avansat', en: 'Advanced' },
    }
    return (
      <div style={{ padding: '0.5rem 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>{lang === 'ro' ? info.ro : info.en}</h1>

        {sub === 'invatare-ai' && (roadmaps.length > 0 || cursuri.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: roadmaps.length > 0 && cursuri.length > 0 ? '1fr 1fr' : '1fr', gap: 24, marginBottom: 32 }}>
            {cursuri.length > 0 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{lang === 'ro' ? 'Cursuri' : 'Courses'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {cursuri.map((cu: any) => (
                    <a key={cu.id} href={`/${lang}/curs/${cu.slug}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid #e5e5e5', borderRadius: 10, padding: 14, display: 'block' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: cu.gratuit ? '#0F6E56' : '#B8860B' }}>{cu.gratuit ? (lang === 'ro' ? 'Gratuit' : 'Free') : (lang === 'ro' ? 'Abonament' : 'Subscription')}</span>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '6px 0' }}>{cu.titlu}</h3>
                      <p style={{ fontSize: 12, color: '#aaa' }}>{Array.isArray(cu.lectii) ? cu.lectii.length : 0} {lang === 'ro' ? 'lecții' : 'lessons'}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sub !== 'invatare-ai' && (
          <>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{lang === 'ro' ? 'Articole' : 'Articles'}</h2>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {SUBMENIURI.map((s) => {
            const activ = (sub || '') === s.slug
            const href = s.slug ? `/${lang}/pilon/educatie?sub=${s.slug}` : `/${lang}/pilon/educatie`
            return (
              <a key={s.slug || 'toate'} href={href} style={{ padding: '6px 14px', borderRadius: 20, textDecoration: 'none', fontSize: 13, fontWeight: 500, border: '1px solid ' + (activ ? 'transparent' : '#d4d4d4'), background: activ ? '#185FA5' : 'transparent', color: activ ? '#fff' : '#444' }}>
                {lang === 'ro' ? s.ro : s.en}
              </a>
            )
          })}
        </nav>
          </>
        )}
        {articole.length === 0 ? (
          <p style={{ color: '#888' }}>{lang === 'ro' ? 'Încă nu sunt articole în această secțiune.' : 'No articles in this section yet.'}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {articole.map((a: any) => <CardArticol key={a.id} a={a} lang={lang} />)}
          </div>
        )}
      </div>
    )
  }

  if (pilon === 'tools') {
    const { docs: tooluri } = await getTooluri(lang)
    const { docs: articole } = await getArticolePilon(lang, 'tools')
    const afiliereTxt = lang === 'ro'
      ? 'Unele linkuri sunt de afiliere. Dacă te abonezi printr-un astfel de link, putem primi un comision — fără cost suplimentar pentru tine. Scorurile sunt editoriale și independente.'
      : 'Some links are affiliate links. We may earn a commission at no extra cost to you. Scores are editorial and independent.'

    return (
      <div style={{ padding: '0.5rem 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{titluPilon}</h1>
        <p style={{ fontSize: 12, color: '#888', background: '#f6f6f4', borderRadius: 8, padding: '10px 14px', marginBottom: 24, lineHeight: 1.5 }}>{afiliereTxt}</p>

        {/* CATALOG DE UNELTE */}
        {tooluri.length === 0 ? (
          <p style={{ color: '#888' }}>{lang === 'ro' ? 'Niciun tool în catalog deocamdată.' : 'No tools in the catalog yet.'}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
            {tooluri.map((t: any) => {
              const link = t.linkAfiliat || t.website
              const pret = t.pret && PRET[t.pret] ? (lang === 'ro' ? PRET[t.pret].ro : PRET[t.pret].en) : ''
              return (
                <div key={t.id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{t.nume}</h3>
                    {typeof t.scor === 'number' && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: t.scor >= 8 ? '#0F6E56' : '#444', background: '#f1f1ef', borderRadius: 6, padding: '3px 8px' }}>{t.scor.toFixed(1)}</span>
                    )}
                  </div>
                  {pret && <span style={{ fontSize: 12, color: '#888' }}>{pret}</span>}
                  {t.descriere && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>{t.descriere}</p>}
                  <a href={link} target="_blank" rel="noopener nofollow sponsored" style={{ marginTop: 'auto', padding: '8px 14px', background: '#185FA5', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
                    {lang === 'ro' ? 'Vizitează' : 'Visit'}
                  </a>
                  {t.linkAfiliat && <span style={{ fontSize: 10, color: '#aaa', textAlign: 'center' }}>{lang === 'ro' ? 'link de afiliere' : 'affiliate link'}</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* ARTICOLE DESPRE TOOL-URI */}
        {articole.length > 0 && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{lang === 'ro' ? 'Articole despre unelte AI' : 'Articles about AI tools'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
              {articole.map((a: any) => <CardArticol key={a.id} a={a} lang={lang} />)}
            </div>
          </>
        )}
      </div>
    )
  }

  // ceilalți piloni: doar articole
  const { docs: articole } = await getArticolePilon(lang, pilon)
  const gol = lang === 'ro' ? 'Încă nu sunt articole în această secțiune.' : 'No articles in this section yet.'
  return (
    <div style={{ padding: '0.5rem 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>{titluPilon}</h1>
      {articole.length === 0 ? (
        <p style={{ color: '#888' }}>{gol}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {articole.map((a: any) => <CardArticol key={a.id} a={a} lang={lang} />)}
        </div>
      )}
    </div>
  )
}
