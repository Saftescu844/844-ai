/**
 * Editorial discovery proposal, not the live CMS Source Registry.
 * No scheduler or publisher consumes this catalogue. Adding an entry here
 * never authorizes ingestion, source trust or publication in any environment.
 */
export interface FlashDiscoveryCatalogEntry {
  key: string
  name: string
  sourceUrl: string
  discoveryUrl: string
  method: 'rss' | 'html' | 'research'
  pillars: Array<'stiri' | 'sanatate' | 'educatie' | 'tools' | 'afaceri'>
  intervalHours: number
  maxCandidatesPerScan: number
  authority: 'own-announcements' | 'own-research' | 'discovery-only'
}

export const FLASH_DISCOVERY_CATALOG: FlashDiscoveryCatalogEntry[] = [
  {
    key: 'ec-ai', name: 'Comisia Europeană — Digital Strategy / AI',
    sourceUrl: 'https://digital-strategy.ec.europa.eu/',
    discoveryUrl: 'https://digital-strategy.ec.europa.eu/en/related-content?topic=119',
    method: 'html', pillars: ['stiri', 'educatie', 'afaceri'],
    intervalHours: 6, maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'google-research', name: 'Google Research',
    sourceUrl: 'https://research.google/',
    discoveryUrl: 'https://research.google/blog/rss/',
    method: 'rss', pillars: ['stiri', 'sanatate', 'educatie', 'tools', 'afaceri'],
    intervalHours: 6, maxCandidatesPerScan: 10, authority: 'own-research',
  },
  {
    key: 'mit-news-ai', name: 'MIT News — Artificial Intelligence',
    sourceUrl: 'https://news.mit.edu/',
    discoveryUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    method: 'rss', pillars: ['stiri', 'sanatate', 'educatie', 'afaceri'],
    intervalHours: 6, maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'openai-news', name: 'OpenAI News',
    sourceUrl: 'https://openai.com/', discoveryUrl: 'https://openai.com/news/rss.xml',
    method: 'rss', pillars: ['stiri', 'tools', 'educatie', 'afaceri'],
    intervalHours: 1, maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'anthropic-news', name: 'Anthropic News',
    sourceUrl: 'https://www.anthropic.com/', discoveryUrl: 'https://www.anthropic.com/news',
    method: 'html', pillars: ['stiri', 'tools', 'educatie', 'afaceri'],
    intervalHours: 1, maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'unesco-education', name: 'UNESCO — AI in Education',
    sourceUrl: 'https://www.unesco.org/',
    discoveryUrl: 'https://www.unesco.org/en/digital-education/artificial-intelligence',
    method: 'html', pillars: ['educatie'], intervalHours: 6,
    maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'pubmed-ai', name: 'PubMed — AI research discovery',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/',
    discoveryUrl: 'https://pubmed.ncbi.nlm.nih.gov/?term=artificial+intelligence&sort=date',
    method: 'research', pillars: ['sanatate'], intervalHours: 24,
    maxCandidatesPerScan: 20, authority: 'discovery-only',
  },
  {
    key: 'arxiv-ai', name: 'arXiv — cs.AI',
    sourceUrl: 'https://arxiv.org/', discoveryUrl: 'https://arxiv.org/list/cs.AI/recent',
    method: 'research', pillars: ['stiri', 'sanatate', 'educatie', 'tools', 'afaceri'],
    intervalHours: 24, maxCandidatesPerScan: 20, authority: 'discovery-only',
  },
  {
    key: 'openreview', name: 'OpenReview',
    sourceUrl: 'https://openreview.net/', discoveryUrl: 'https://openreview.net/',
    method: 'research', pillars: ['stiri', 'sanatate', 'educatie', 'tools', 'afaceri'],
    intervalHours: 24, maxCandidatesPerScan: 20, authority: 'discovery-only',
  },
  {
    key: 'huggingface-papers', name: 'Hugging Face Papers',
    sourceUrl: 'https://huggingface.co/', discoveryUrl: 'https://huggingface.co/papers',
    method: 'research', pillars: ['stiri', 'tools', 'educatie'],
    intervalHours: 24, maxCandidatesPerScan: 20, authority: 'discovery-only',
  },
  {
    key: 'ro-education', name: 'Ministerul Educației și Cercetării',
    sourceUrl: 'https://www.edu.ro/', discoveryUrl: 'https://www.edu.ro/',
    method: 'research', pillars: ['educatie'], intervalHours: 6,
    maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'ro-uefiscdi', name: 'UEFISCDI',
    sourceUrl: 'https://uefiscdi.gov.ro/', discoveryUrl: 'https://uefiscdi.gov.ro/',
    method: 'research', pillars: ['educatie', 'afaceri'], intervalHours: 6,
    maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'ro-dnsc', name: 'DNSC',
    sourceUrl: 'https://dnsc.ro/', discoveryUrl: 'https://dnsc.ro/',
    method: 'research', pillars: ['stiri', 'afaceri', 'educatie'], intervalHours: 6,
    maxCandidatesPerScan: 10, authority: 'own-announcements',
  },
  {
    key: 'reuters', name: 'Reuters',
    sourceUrl: 'https://www.reuters.com/', discoveryUrl: 'https://www.reuters.com/',
    method: 'research', pillars: ['stiri', 'sanatate', 'educatie', 'afaceri'],
    intervalHours: 1, maxCandidatesPerScan: 10, authority: 'discovery-only',
  },
  {
    key: 'mit-tech-review', name: 'MIT Technology Review',
    sourceUrl: 'https://www.technologyreview.com/',
    discoveryUrl: 'https://www.technologyreview.com/',
    method: 'research', pillars: ['stiri', 'sanatate', 'educatie', 'afaceri'],
    intervalHours: 6, maxCandidatesPerScan: 10, authority: 'discovery-only',
  },
]
