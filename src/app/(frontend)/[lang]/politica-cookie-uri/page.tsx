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
            <strong>Cookie-uri de la terți — conținut video încorporat.</strong> Videoclipurile
            YouTube și Vimeo sunt blocate inițial. Înainte de acord, playerul nu trimite cereri
            furnizorului și nu încarcă imagini de previzualizare externe. După acceptare, furnizorul
            poate primi date tehnice și utiliza cookie-uri sau alte tehnologii, inclusiv pentru
            analiză ori publicitate. Folosim modul de confidențialitate îmbunătățită YouTube și
            opțiunea Vimeo de limitare a urmăririi; acestea nu înlocuiesc acordul.
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
            Pentru fiecare videoclip poți alege „Accept și încarc videoclipul” sau „Nu accept”.
            Refuzul păstrează playerul blocat și nu împiedică citirea paginii. Acordul se aplică
            doar acelui videoclip cât timp este afișat; nu este salvat în cookie-uri sau în stocarea
            browserului și nu autorizează automat alte videoclipuri. La reîncărcarea paginii sau
            redeschiderea unei lecții este necesar un nou acord.
          </p>

          <p style={s.p}>
            Nu folosim instrumente de analiză a traficului, pixeli publicitari sau reCAPTCHA. Brevo
            este folosit pe server pentru trimiterea emailurilor; formularul de newsletter nu
            încarcă un script Brevo în browser.
          </p>

          <h2 style={s.h2}>Cum îți gestionezi preferințele</h2>
          <p style={s.p}>
            Lângă fiecare player încărcat găsești butonul „Retrag acordul și opresc videoclipul”.
            Acesta elimină playerul și oprește redarea. Nu poate șterge datele deja primite de
            furnizor sau cookie-urile sale; le poți gestiona din setările browserului și prin
            controalele furnizorului. Blocarea cookie-urilor strict necesare poate împiedica
            autentificarea. Nu folosim un banner general pentru acordul video: alegerea se face
            direct lângă fiecare videoclip.
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
            <strong>Third-party cookies — embedded video content.</strong> YouTube and Vimeo videos
            are initially blocked. Before consent, the player makes no requests to the provider and
            loads no external preview images. After acceptance, the provider may receive technical
            data and use cookies or other technologies, including for analytics or advertising. We
            use YouTube privacy-enhanced mode and Vimeo&apos;s tracking-limiting option; these do
            not replace consent.
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
            For each video you can choose “Accept and load video” or “Decline”. Declining keeps the
            player blocked and does not prevent reading the page. Consent applies only to that video
            while it is displayed; it is not saved in cookies or browser storage and does not
            automatically authorize other videos. Reloading the page or reopening a lesson requires
            fresh consent.
          </p>

          <p style={s.p}>
            No traffic analytics tools, advertising pixels, or reCAPTCHA were identified in the
            code. Brevo is used server-side to send emails; the newsletter form does not load a
            Brevo script in the browser.
          </p>

          <h2 style={s.h2}>Managing your preferences</h2>
          <p style={s.p}>
            Each loaded player has a “Withdraw consent and stop video” button. It removes the player
            and stops playback. It cannot erase data already received by the provider or its
            cookies; manage these in your browser settings and through the provider&apos;s controls.
            Blocking strictly necessary cookies may prevent sign-in. We do not use a general video
            consent banner: the choice is made next to each video.
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
