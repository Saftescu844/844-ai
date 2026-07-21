const s = {
  h1: { fontSize: 28, fontWeight: 700, marginTop: 0, marginBottom: 6 },
  meta: { fontSize: 13, color: '#888', marginBottom: 30 },
  h2: { fontSize: 19, fontWeight: 700, marginTop: 30, marginBottom: 10 },
  p: { fontSize: 16, lineHeight: 1.7, color: '#333', marginBottom: 12 },
  ul: { fontSize: 16, lineHeight: 1.7, color: '#333', paddingLeft: 22, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14, marginBottom: 16 },
  th: { textAlign: 'left' as const, borderBottom: '2px solid #ddd', padding: '8px 10px' },
  td: { borderBottom: '1px solid #eee', padding: '8px 10px', verticalAlign: 'top' as const },
}

export default async function PaginaConfidentialitate(props: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await props.params

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 0' }}>
      <h1 style={s.h1}>{lang === 'ro' ? 'Politica de Confidențialitate' : 'Privacy Policy'}</h1>
      <p style={s.meta}>
        {lang === 'ro' ? 'Ultima actualizare: 21 iulie 2026' : 'Last updated: July 21, 2026'}
      </p>

      {lang === 'ro' ? (
        <>
          <h2 style={s.h2}>1. Cine este operatorul de date</h2>
          <p style={s.p}>
            Site-ul <strong>844-ai.ro</strong> este operat de <strong>Săftescu Gabriel</strong>,
            persoană fizică, cu domiciliul în România.
          </p>
          <p style={s.p}>
            Pentru orice întrebare legată de datele tale personale sau pentru exercitarea
            drepturilor descrise mai jos, ne poți contacta la:{' '}
            <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>
          </p>

          <h2 style={s.h2}>2. Ce date colectăm, în ce scop și pe ce temei legal</h2>
          <p style={s.p}>
            <strong>2.1. Abonarea la newsletter.</strong> Colectăm adresa de email, limba preferată
            și segmentul de interes ales. Scop: trimiterea newsletter-ului. Temei legal:
            consimțământul tău explicit (art. 6 alin. 1 lit. a GDPR), pe care îl poți retrage
            oricând.
          </p>
          <p style={s.p}>
            <strong>2.2. Vizitarea site-ului.</strong> Infrastructura noastră tehnică înregistrează
            automat date tehnice, inclusiv adresa IP, în scop de funcționare și securitate. Temei
            legal: interesul legitim (art. 6 alin. 1 lit. f GDPR). Nu folosim aceste date pentru
            profilare sau publicitate.
          </p>
          <p style={s.p}>
            <strong>2.3. Conținut video încorporat.</strong> Unele articole includ video-uri YouTube
            sau Vimeo. La încărcarea paginii, aceste platforme pot seta cookie-uri și primi date
            tehnice despre vizita ta. Temei legal: consimțământul tău, prin banner-ul de cookie-uri.
            Detalii complete în <a href={`/${lang}/politica-cookie-uri`}>Politica de Cookie-uri</a>.
          </p>
          <p style={s.p}>
            <strong>2.4. Ce nu colectăm momentan.</strong> Nu folosim instrumente de analiză de
            trafic, pixeli publicitari sau reCAPTCHA. Dacă va apărea o schimbare, această politică
            va fi actualizată înainte de activare.
          </p>

          <h2 style={s.h2}>3. Cât timp păstrăm datele</h2>
          <ul style={s.ul}>
            <li>
              Abonații newsletter: cât timp rămâi abonat, plus maximum 30 de zile de la dezabonare.
            </li>
            <li>
              Date tehnice/log-uri: perioada strict necesară scopurilor de securitate, conform
              politicilor furnizorilor de infrastructură.
            </li>
          </ul>

          <h2 style={s.h2}>4. Cui transmitem datele</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Furnizor</th>
                <th style={s.th}>Rol</th>
                <th style={s.th}>Locație</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>Railway</td>
                <td style={s.td}>Găzduire aplicație</td>
                <td style={s.td}>UE (Amsterdam)</td>
              </tr>
              <tr>
                <td style={s.td}>Supabase</td>
                <td style={s.td}>Bază de date și stocare imagini</td>
                <td style={s.td}>UE (Frankfurt)</td>
              </tr>
              <tr>
                <td style={s.td}>YouTube / Vimeo</td>
                <td style={s.td}>Conținut video încorporat</td>
                <td style={s.td}>SUA (doar la vizionare video)</td>
              </tr>
            </tbody>
          </table>
          <p style={s.p}>
            Nu vindem și nu închiriem datele tale către terți în scopuri comerciale.
          </p>

          <h2 style={s.h2}>5. Drepturile tale</h2>
          <ul style={s.ul}>
            <li>Acces la datele deținute despre tine</li>
            <li>Rectificarea datelor inexacte</li>
            <li>Ștergerea datelor („dreptul de a fi uitat")</li>
            <li>Restricționarea prelucrării</li>
            <li>Portabilitatea datelor</li>
            <li>Opoziția la prelucrarea bazată pe interes legitim</li>
            <li>Retragerea consimțământului, oricând</li>
          </ul>
          <p style={s.p}>
            Pentru exercitarea acestor drepturi:{' '}
            <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>. Răspundem în maximum 30 de
            zile.
          </p>

          <h2 style={s.h2}>6. Dreptul de a depune plângere</h2>
          <p style={s.p}>
            Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
            (ANSPDCP):{' '}
            <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">
              www.dataprotection.ro
            </a>
          </p>

          <h2 style={s.h2}>7. Securitatea datelor</h2>
          <p style={s.p}>
            Folosim conexiune criptată (HTTPS), acces restricționat la panoul de administrare și
            backup-uri periodice ale bazei de date.
          </p>

          <h2 style={s.h2}>8. Cookie-uri</h2>
          <p style={s.p}>
            Detalii complete: <a href={`/${lang}/politica-cookie-uri`}>Politica de Cookie-uri</a>.
          </p>

          <h2 style={s.h2}>9. Copii</h2>
          <p style={s.p}>
            844-ai.ro nu este destinat în mod specific copiilor și nu colectăm cu bună știință date
            de la persoane sub 16 ani.
          </p>

          <h2 style={s.h2}>10. Modificări</h2>
          <p style={s.p}>
            Putem actualiza această politică periodic. Modificările semnificative vor fi comunicate
            prin actualizarea datei de mai sus.
          </p>
        </>
      ) : (
        <>
          <h2 style={s.h2}>1. Who is the data controller</h2>
          <p style={s.p}>
            <strong>844-ai.ro</strong> is operated by <strong>Săftescu Gabriel</strong>, an
            individual residing in Romania.
          </p>
          <p style={s.p}>
            For any question about your personal data or to exercise the rights described below,
            contact us at: <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>
          </p>

          <h2 style={s.h2}>2. What data we collect, why, and on what legal basis</h2>
          <p style={s.p}>
            <strong>2.1. Newsletter subscription.</strong> We collect your email address, preferred
            language, and chosen interest segment. Purpose: sending the newsletter. Legal basis:
            your explicit consent (GDPR Art. 6(1)(a)), which you can withdraw at any time.
          </p>
          <p style={s.p}>
            <strong>2.2. Visiting the site.</strong> Our technical infrastructure automatically logs
            technical data, including IP address, for operation and security purposes. Legal basis:
            legitimate interest (GDPR Art. 6(1)(f)). We do not use this data for profiling or
            advertising.
          </p>
          <p style={s.p}>
            <strong>2.3. Embedded video content.</strong> Some articles include YouTube or Vimeo
            videos. When such a page loads, these platforms may set cookies and receive technical
            data about your visit. Legal basis: your consent, via the cookie banner. Full details in
            our <a href={`/${lang}/politica-cookie-uri`}>Cookie Policy</a>.
          </p>
          <p style={s.p}>
            <strong>2.4. What we do not collect at this time.</strong> We do not use traffic
            analytics tools, advertising pixels, or reCAPTCHA. This policy will be updated before
            any such tool is activated.
          </p>

          <h2 style={s.h2}>3. How long we keep your data</h2>
          <ul style={s.ul}>
            <li>
              Newsletter subscribers: for as long as you remain subscribed, plus up to 30 days after
              unsubscribing.
            </li>
            <li>
              Technical data/logs: for the period strictly necessary for security purposes, per our
              infrastructure providers' policies.
            </li>
          </ul>

          <h2 style={s.h2}>4. Who we share data with</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Provider</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>Railway</td>
                <td style={s.td}>Application hosting</td>
                <td style={s.td}>EU (Amsterdam)</td>
              </tr>
              <tr>
                <td style={s.td}>Supabase</td>
                <td style={s.td}>Database and image storage</td>
                <td style={s.td}>EU (Frankfurt)</td>
              </tr>
              <tr>
                <td style={s.td}>YouTube / Vimeo</td>
                <td style={s.td}>Embedded video content</td>
                <td style={s.td}>USA (only when viewing video)</td>
              </tr>
            </tbody>
          </table>
          <p style={s.p}>
            We do not sell or rent your data to third parties for commercial purposes.
          </p>

          <h2 style={s.h2}>5. Your rights</h2>
          <ul style={s.ul}>
            <li>Access to the data we hold about you</li>
            <li>Rectification of inaccurate data</li>
            <li>Erasure ("right to be forgotten")</li>
            <li>Restriction of processing</li>
            <li>Data portability</li>
            <li>Objection to processing based on legitimate interest</li>
            <li>Withdrawal of consent, at any time</li>
          </ul>
          <p style={s.p}>
            To exercise these rights: <a href="mailto:privacy@844-ai.ro">privacy@844-ai.ro</a>. We
            respond within 30 days.
          </p>

          <h2 style={s.h2}>6. Right to lodge a complaint</h2>
          <p style={s.p}>
            Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP):{' '}
            <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">
              www.dataprotection.ro
            </a>
          </p>

          <h2 style={s.h2}>7. Data security</h2>
          <p style={s.p}>
            We use encrypted connections (HTTPS), restricted access to the admin panel, and periodic
            database backups.
          </p>

          <h2 style={s.h2}>8. Cookies</h2>
          <p style={s.p}>
            Full details: <a href={`/${lang}/politica-cookie-uri`}>Cookie Policy</a>.
          </p>

          <h2 style={s.h2}>9. Children</h2>
          <p style={s.p}>
            844-ai.ro is not specifically directed at children and we do not knowingly collect data
            from individuals under 16.
          </p>

          <h2 style={s.h2}>10. Changes</h2>
          <p style={s.p}>
            We may update this policy periodically. Significant changes will be communicated by
            updating the date above.
          </p>
        </>
      )}
    </article>
  )
}
