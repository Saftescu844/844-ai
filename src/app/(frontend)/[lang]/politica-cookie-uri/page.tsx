const s = {
  h1: { fontSize: 28, fontWeight: 700, marginTop: 0, marginBottom: 6 },
  meta: { fontSize: 13, color: '#888', marginBottom: 30 },
  h2: { fontSize: 19, fontWeight: 700, marginTop: 30, marginBottom: 10 },
  p: { fontSize: 16, lineHeight: 1.7, color: '#333', marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14, marginBottom: 16 },
  th: { textAlign: 'left' as const, borderBottom: '2px solid #ddd', padding: '8px 10px' },
  td: { borderBottom: '1px solid #eee', padding: '8px 10px', verticalAlign: 'top' as const },
}

export default async function PaginaCookieUri(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 0' }}>
      <h1 style={s.h1}>{lang === 'ro' ? 'Politica de Cookie-uri' : 'Cookie Policy'}</h1>
      <p style={s.meta}>
        {lang === 'ro' ? 'Ultima actualizare: 21 iulie 2026' : 'Last updated: July 21, 2026'}
      </p>

      {lang === 'ro' ? (
        <>
          <h2 style={s.h2}>Ce sunt cookie-urile</h2>
          <p style={s.p}>
            Cookie-urile sunt fișiere text mici stocate în browserul tău atunci când vizitezi un
            site web. Sunt folosite pentru funcționarea corectă a site-ului, memorarea preferințelor
            tale sau afișarea de conținut încorporat de la terți.
          </p>

          <h2 style={s.h2}>Ce cookie-uri folosim</h2>
          <p style={s.p}>
            <strong>Cookie-uri strict necesare.</strong> Momentan, 844-ai.ro nu setează cookie-uri
            proprii pentru funcționarea de bază (navigare, citire articole, abonare newsletter).
          </p>
          <p style={s.p}>
            <strong>Cookie-uri de la terți — conținut video încorporat.</strong> Anumite articole
            includ video-uri de pe YouTube sau Vimeo. La încărcarea unei astfel de pagini, aceste
            platforme pot seta cookie-uri — inclusiv înainte de a apăsa play — pentru redarea
            video-ului și, potrivit politicilor lor proprii, în scopuri de analiză sau publicitate.
          </p>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Furnizor</th>
                <th style={s.th}>Scop</th>
                <th style={s.th}>Detalii</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>YouTube (Google LLC)</td>
                <td style={s.td}>Redare video</td>
                <td style={s.td}>
                  <a
                    href="https://policies.google.com/technologies/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Politica Google
                  </a>
                </td>
              </tr>
              <tr>
                <td style={s.td}>Vimeo Inc.</td>
                <td style={s.td}>Redare video</td>
                <td style={s.td}>
                  <a
                    href="https://vimeo.com/cookie_policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Politica Vimeo
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={s.p}>
            Aceste cookie-uri se încarcă doar dacă accepți din banner-ul afișat la prima vizită.
            Dacă refuzi, videoclipurile nu se vor încărca automat.
          </p>

          <h2 style={s.h2}>Cum îți gestionezi preferințele</h2>
          <p style={s.p}>
            Poți schimba oricând alegerea inițială din linkul „Setări cookie-uri" din footer-ul
            site-ului, sau poți controla/șterge cookie-urile direct din setările browserului tău.
          </p>

          <h2 style={s.h2}>Modificări</h2>
          <p style={s.p}>
            Dacă vom introduce în viitor alte tipuri de cookie-uri, această politică va fi
            actualizată, iar banner-ul de consimțământ îți va cere din nou acordul pentru noile
            categorii.
          </p>

          <p style={s.p}>
            Pentru întrebări: <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>
          </p>
        </>
      ) : (
        <>
          <h2 style={s.h2}>What are cookies</h2>
          <p style={s.p}>
            Cookies are small text files stored in your browser when you visit a website. They are
            used for the correct functioning of the site, remembering your preferences, or
            displaying content embedded from third parties.
          </p>

          <h2 style={s.h2}>What cookies we use</h2>
          <p style={s.p}>
            <strong>Strictly necessary cookies.</strong> At this time, 844-ai.ro does not set its
            own cookies for basic functionality (browsing, reading articles, newsletter
            subscription).
          </p>
          <p style={s.p}>
            <strong>Third-party cookies — embedded video content.</strong> Some articles include
            YouTube or Vimeo videos. When such a page loads, these platforms may set cookies — even
            before you press play — to enable video playback and, per their own policies, for
            analytics or advertising purposes.
          </p>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Provider</th>
                <th style={s.th}>Purpose</th>
                <th style={s.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>YouTube (Google LLC)</td>
                <td style={s.td}>Video playback</td>
                <td style={s.td}>
                  <a
                    href="https://policies.google.com/technologies/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Policy
                  </a>
                </td>
              </tr>
              <tr>
                <td style={s.td}>Vimeo Inc.</td>
                <td style={s.td}>Video playback</td>
                <td style={s.td}>
                  <a
                    href="https://vimeo.com/cookie_policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Vimeo Policy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <p style={s.p}>
            These cookies load only if you accept from the banner shown on your first visit. If you
            decline, videos will not load automatically.
          </p>

          <h2 style={s.h2}>Managing your preferences</h2>
          <p style={s.p}>
            You can change your initial choice anytime via the "Cookie Settings" link in the site
            footer, or control/delete cookies directly from your browser settings.
          </p>

          <h2 style={s.h2}>Changes</h2>
          <p style={s.p}>
            If we introduce other types of cookies in the future, this policy will be updated, and
            the consent banner will ask for your agreement to the new categories again.
          </p>

          <p style={s.p}>
            Questions: <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>
          </p>
        </>
      )}
    </article>
  )
}
