export interface SourceDiscoveryConfiguration {
  url?: string | null
  feedRSS?: string | null
  discoveryMethod?: 'disabled' | 'rss' | 'html' | 'research' | null
  discoveryUrl?: string | null
  scanIntervalMinutes?: number | null
  maxCandidatesPerScan?: number | null
  maxCandidatesPerDay?: number | null
}

export interface SourceDiscoveryConfigurationIssue {
  path: string
  message: string
}

function parseDiscoveryHttpsUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null
    // DNS/IP enforcement remains the responsibility of the existing retriever.
    if (!url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.local')) return null
    return url
  } catch { return null }
}

function hostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
}

/** Syntactic validation only. Never performs DNS/HTTP or grants ingestion. */
export function validateSourceDiscoveryConfiguration(
  settings: SourceDiscoveryConfiguration,
): SourceDiscoveryConfigurationIssue[] {
  const method = settings.discoveryMethod ?? 'disabled'
  const issues: SourceDiscoveryConfigurationIssue[] = []
  if (!['disabled', 'rss', 'html', 'research'].includes(method)) {
    return [{ path: 'discoveryMethod', message: 'Metodă de monitorizare necunoscută.' }]
  }
  if (method !== 'disabled') {
    const sourceUrl = parseDiscoveryHttpsUrl(settings.url)
    const endpointField = method === 'rss' ? 'feedRSS' : 'discoveryUrl'
    const endpoint = parseDiscoveryHttpsUrl(settings[endpointField])
    if (!sourceUrl) issues.push({ path: 'url', message: 'Sursa necesită o adresă HTTPS validă, fără credențiale sau fragment.' })
    if (!endpoint) issues.push({ path: endpointField, message: 'Configurează o adresă HTTPS validă, fără credențiale sau fragment.' })
    if (sourceUrl && endpoint && hostname(sourceUrl) !== hostname(endpoint)) {
      issues.push({ path: endpointField, message: 'Adresa de monitorizare trebuie să aparțină domeniului sursei înregistrate.' })
    }
  }
  for (const [path, fallback, min, max] of [
    ['scanIntervalMinutes', 360, 60, 10080],
    ['maxCandidatesPerScan', 10, 1, 20],
    ['maxCandidatesPerDay', 40, 1, 500],
  ] as const) {
    // Missing values on create receive Payload defaults; explicit null is invalid.
    const value = settings[path] === undefined ? fallback : settings[path]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      issues.push({ path, message: `Introdu un număr întreg între ${min} și ${max}.` })
    }
  }
  return issues
}
