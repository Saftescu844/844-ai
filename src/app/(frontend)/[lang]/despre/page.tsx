export default async function PaginaDespre(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params
  return (
    <article style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>
        {lang === 'ro' ? 'Despre 844-ai.ro' : 'About 844-ai.ro'}
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333', marginBottom: 16 }}>
        {lang === 'ro'
          ? '844-ai.ro este o platformă românească de referință dedicată inteligenței artificiale — știri verificate, analize, resurse educaționale și un director de unelte AI, pentru un public divers: ingineri, studenți, medici, profesori și publicul larg.'
          : '844-ai.ro is a Romanian reference platform dedicated to artificial intelligence — verified news, analysis, educational resources, and an AI tool directory, for a diverse audience: engineers, students, doctors, teachers, and the general public.'}
      </p>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333', marginBottom: 16 }}>
        {lang === 'ro'
          ? '844-ai.ro este fondat și dezvoltat de Săftescu Gabriel, doctor inginer (titlu obținut cu distincția „Cum Laude") în Comunicații și Sisteme Expert — Academia Tehnică Militară, București, 2001. Sistemele expert, subiectul specializării sale doctorale, reprezintă una dintre ramurile fundamentale ale inteligenței artificiale — o legătură care leagă direct pregătirea sa de acum două decenii de proiectul de astăzi.'
          : '844-ai.ro is founded and developed by Săftescu Gabriel, PhD Engineer (awarded with "Cum Laude" distinction) in Communications and Expert Systems — Military Technical Academy, Bucharest, 2001. Expert systems, the subject of his doctoral specialization, are one of the foundational branches of artificial intelligence — a direct link between his training two decades ago and today\'s project.'}
      </p>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#333' }}>
        {lang === 'ro'
          ? 'Platforma este dezvoltată tehnic cu sprijinul Claude Code (Anthropic), folosit ca partener de dezvoltare software pe tot parcursul proiectului — de la arhitectura inițială până la automatizările de conținut și mentenanța curentă.'
          : 'The platform is technically developed with the support of Claude Code (Anthropic), used as a software development partner throughout the project — from initial architecture to content automation and ongoing maintenance.'}
      </p>
    </article>
  )
}
