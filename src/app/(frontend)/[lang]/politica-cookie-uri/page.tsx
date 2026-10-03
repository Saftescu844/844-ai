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
        {lang === 'ro' ? 'Ultima actualizare: 3 octombrie 2026' : 'Last updated: October 3, 2026'}
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
            <strong>Cookie-uri strict necesare.</strong> Autentificarea în cont și în panoul de
            administrare folosește cookie-ul de sesiune Payload (<code>payload-token</code>) pentru
            a recunoaște utilizatorul conectat. Durata configurată este de două ore, cu reînnoire la
            autentificare; deconectarea încheie sesiunea. Cookie-ul nu are scop publicitar.
            Navigarea și citirea articolelor nu necesită un cont. Cookie-urile strict necesare
            serviciului solicitat nu necesită acord pentru utilizarea lor; detaliile privind datele
            sunt în{' '}
            <a href={`/${lang}/politica-confidentialitate`}>Politica de confidențialitate</a>.
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
            Implementarea actuală încarcă direct playerul video. În prezent nu există un banner de
            consimțământ sau un mecanism care să blocheze playerul până la acord. Prin urmare, nu
            putem afirma că aceste cookie-uri se încarcă doar după acceptare. Încărcarea opțională a
            serviciilor video trebuie condiționată de acord înainte de lansarea largă. Citirea
            acestei politici nu constituie consimțământ.
          </p>

          <p style={s.p}>
            Nu folosim instrumente de analiză a traficului, pixeli publicitari sau reCAPTCHA. Brevo
            este folosit pe server pentru trimiterea emailurilor; formularul de newsletter nu
            încarcă un script Brevo în browser.
          </p>

          <h2 style={s.h2}>Cum îți gestionezi preferințele</h2>
          <p style={s.p}>
            Poți controla, bloca sau șterge cookie-urile din setările browserului. Blocarea
            cookie-urilor necesare poate împiedica autentificarea. Site-ul nu oferă momentan un link
            „Setări cookie-uri” și nu memorează o alegere de consimțământ pentru video. Controalele
            browserului nu înlocuiesc obligația site-ului de a cere acordul prealabil.
          </p>

          <h2 style={s.h2}>Modificări</h2>
          <p style={s.p}>
            Dacă vom introduce în viitor alte tipuri de cookie-uri, această politică va fi
            actualizată înainte de activare, împreună cu mecanismele necesare de consimțământ și
            retragere a acordului.
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
            <strong>Strictly necessary cookies.</strong> Account and admin sign-in use the Payload
            session cookie (<code>payload-token</code>) to recognize the signed-in user. Its
            lifetime follows the authentication session; signing out ends the session. It is not
            used for advertising. Browsing and reading articles do not require an account. Cookies
            strictly necessary for the requested service do not require consent for their use. See
            the <a href={`/${lang}/politica-confidentialitate`}>Privacy Policy</a> for data
            processing details.
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
            The current implementation loads the video player directly. There is currently no
            consent banner or mechanism blocking the player until consent. We therefore cannot claim
            that these cookies load only after acceptance. Optional video services must be gated by
            consent before the wider launch. Reading this policy does not constitute consent.
          </p>

          <p style={s.p}>
            No traffic analytics tools, advertising pixels, or reCAPTCHA were identified in the
            code. Brevo is used server-side to send emails; the newsletter form does not load a
            Brevo script in the browser.
          </p>

          <h2 style={s.h2}>Managing your preferences</h2>
          <p style={s.p}>
            You can control, block, or delete cookies in your browser settings. Blocking necessary
            cookies may prevent sign-in. The site does not currently offer a Cookie Settings link or
            store a video consent choice. Browser controls do not replace the site&apos;s duty to
            obtain prior consent.
          </p>

          <h2 style={s.h2}>Changes</h2>
          <p style={s.p}>
            If we introduce other types of cookies in the future, this policy will be updated, and
            the required consent and withdrawal controls will be introduced before activation.
          </p>

          <p style={s.p}>
            Questions: <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>
          </p>
        </>
      )}
    </article>
  )
}
