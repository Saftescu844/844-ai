import { getArticole, getFlashAi } from '@/lib/payload'

function etichetaArticol(tip: string, lang: string) {
  if (tip === 'analiza') return lang === 'ro' ? 'Analiză' : 'Analysis'
  if (tip === 'frontiera') return lang === 'ro' ? 'Frontieră' : 'Frontier'
  return lang === 'ro' ? 'Știre' : 'News'
}

function etichetaFlash(flashType: string, lang: string) {
  const labels: Record<string, { ro: string; en: string }> = {
    announcement: { ro: 'Anunț', en: 'Announcement' },
    research: { ro: 'Cercetare', en: 'Research' },
    regulation: { ro: 'Reglementare', en: 'Regulation' },
    product: { ro: 'Produs / instrument', en: 'Product / tool' },
    business: { ro: 'Afaceri', en: 'Business' },
    incident: { ro: 'Incident', en: 'Incident' },
    update: { ro: 'Actualizare', en: 'Update' },
    other: { ro: 'Altele', en: 'Other' },
  }

  const label = labels[flashType]?.[lang === 'en' ? 'en' : 'ro']
    ?? (lang === 'ro' ? 'Flash' : 'Flash')

  return `Flash AI · ${label}`
}

function timestamp(value: unknown): number {
  if (typeof value !== 'string') return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function Homepage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params

  const [
    { docs: articole },
    { docs: flashuri },
  ] = await Promise.all([
    getArticole(lang, { limit: 15 }),
    getFlashAi(lang, { limit: 15 }),
  ])

  const noutati = [
    ...articole.map((item: any) => ({
      kind: 'article' as const,
      item,
    })),
    ...flashuri.map((item: any) => ({
      kind: 'flash' as const,
      item,
    })),
  ]
    .sort(
      (a, b) =>
        timestamp(b.item.publishedAt) -
        timestamp(a.item.publishedAt),
    )
    .slice(0, 15)

  const txt = lang === 'ro'
    ? { titlu: 'Ultimele noutăți', gol: 'Încă nu este conținut publicat.' }
    : { titlu: 'Latest updates', gol: 'No published content yet.' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{txt.titlu}</h1>
      {noutati.length === 0 ? (
        <p style={{ color: '#888' }}>{txt.gol}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {noutati.map(({ kind, item }: any) => {
            const href =
              kind === 'flash'
                ? `/${lang}/flash/${item.slug}`
                : `/${lang}/articol/${item.slug}`

            const label =
              kind === 'flash'
                ? etichetaFlash(item.flashType, lang)
                : etichetaArticol(item.tip, lang)

            return (
              <a
                key={`${kind}-${item.id}`}
                href={href}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  padding: 14,
                  display: 'block',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: kind === 'flash' ? '#7A4E00' : '#185FA5',
                  }}
                >
                  {label}
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, margin: '6px 0' }}>
                  {item.titlu}
                </h2>
                {item.excerpt && (
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>
                    {item.excerpt.length > 110 ? item.excerpt.slice(0, 110) + '…' : item.excerpt}
                  </p>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
