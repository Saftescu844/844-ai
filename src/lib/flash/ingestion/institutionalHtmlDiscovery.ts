import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { Surse } from '@/payload-types'
import type { FlashRssCandidate, FlashRssIngestionSourcePlan } from './rssCandidateIngestion'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'
import { flashPublicationTimestamp } from './flashPublicationFreshness'
import { parseAnthropicNewsCandidates } from './anthropicNewsArticleAdapter'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value
const hasClass = (n: Element, value: string) => (attr(n, 'class') ?? '').split(/\s+/).includes(value)
const excluded = (n: Element) => ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside', 'figure', 'figcaption'].includes(n.tagName) || attr(n, 'hidden') !== undefined || attr(n, 'aria-hidden') === 'true'
function elements(n: Node): Element[] {
  if ('tagName' in n && excluded(n)) return []
  return [...('tagName' in n ? [n] : []), ...('childNodes' in n ? n.childNodes.flatMap(elements) : [])]
}
function text(n: Node): string {
  if (n.nodeName === '#text') return (n as DefaultTreeAdapterMap['textNode']).value
  if ('tagName' in n && excluded(n)) return ''
  if ('tagName' in n && n.tagName === 'br') return ' '
  return 'childNodes' in n ? n.childNodes.map(text).join('') : ''
}
const clean = (n: Node) => text(n).replace(/\s+/g, ' ').trim()
const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
function safeUrl(value: string, base?: string): URL {
  const url = new URL(value, base)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Institutional discovery requires HTTPS without credentials or custom ports.')
  return url
}
const listingPaths: Record<string, string> = {
  'unesco.org': '/en/digital-education/artificial-intelligence',
  'digital-strategy.ec.europa.eu': '/en/related-content',
  'anthropic.com': '/news',
}
export function institutionalListingSupported(source: string, listing: string): boolean {
  try {
    const a = safeUrl(source), b = safeUrl(listing)
    return host(a) === host(b) && listingPaths[host(a)] === b.pathname.replace(/\/$/, '') &&
      (host(a) !== 'digital-strategy.ec.europa.eu' || b.searchParams.get('topic') === '119')
  } catch { return false }
}
export function institutionalArticleUrl(source: string, value: string): string | null {
  try {
    const a = safeUrl(source), b = safeUrl(value, source)
    const prefix = host(a) === 'unesco.org' ? '/en/articles/' : host(a) === 'digital-strategy.ec.europa.eu' ? '/en/news/' : null
    if (host(a) !== host(b) || !prefix || !new RegExp(`^${prefix}[a-z0-9]+(?:-[a-z0-9]+)*/?$`).test(b.pathname)) return null
    b.search = ''; b.hash = ''
    return b.toString()
  } catch { return null }
}
/** Visible dates only. A modified timestamp never substitutes for original publication. */
export function institutionalPublicationDate(value: string): string {
  const m = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(value.trim())
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const month = m ? months.indexOf(m[2]!.toLowerCase()) + 1 : 0
  const result = m && month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : ''
  if (flashPublicationTimestamp(result) === null) throw new Error('Institutional publication date is invalid or missing.')
  return result
}
export function assessInstitutionalHtmlSource(source: Surse): FlashRssIngestionSourcePlan {
  const supported = source.discoveryMethod === 'html' && institutionalListingSupported(source.url, source.discoveryUrl ?? '')
  const bound = (value: number | null | undefined, fallback: number, maximum: number) => Number.isInteger(value) && value! > 0 ? Math.min(value!, maximum) : fallback
  return { sourceId: source.id, sourceName: source.nume, registeredSourceUrl: source.url,
    feedUrl: supported ? source.discoveryUrl! : null, discoveryMethod: 'html',
    sourceRole: source.sourceRole, editorialTrust: source.editorialTrust, citationMode: source.citationMode,
    allowAutoPublish: source.allowAutoPublish === true, maxCandidatesPerScan: bound(source.maxCandidatesPerScan, 10, 20),
    maxCandidatesPerDay: bound(source.maxCandidatesPerDay, 40, 500), candidateSkipMemory: source.rssCandidateSkipMemory ?? [],
    ready: supported, blocker: supported ? null : 'unsupported_html_discovery' }
}
export function parseInstitutionalHtmlCandidates(plan: FlashRssIngestionSourcePlan, html: string): FlashRssCandidate[] {
  if (!plan.feedUrl || !institutionalListingSupported(plan.registeredSourceUrl, plan.feedUrl)) throw new Error('Unsupported institutional listing.')
  if (host(new URL(plan.registeredSourceUrl)) === 'anthropic.com') return parseAnthropicNewsCandidates(plan, html)
  const all = elements(parse(html))
  const main = all.filter(n => n.tagName === 'main')
  if (main.length !== 1) throw new Error('Institutional listing requires one main container.')
  const unesco = host(new URL(plan.registeredSourceUrl)) === 'unesco.org'
  const cards = elements(main[0]!).filter(n => unesco ? n.tagName === 'article' && hasClass(n, 'teaser') : hasClass(n, 'ecl-content-item'))
  const seen = new Set<string>(), candidates: FlashRssCandidate[] = []
  for (const card of cards.slice(0, 50)) {
    const nodes = elements(card)
    const links = nodes.filter(n => n.tagName === 'a').map(n => ({ n, url: institutionalArticleUrl(plan.registeredSourceUrl, attr(n, 'href') ?? '') })).filter(x => x.url)
    const urls = [...new Set(links.map(x => x.url!))]
    if (urls.length !== 1 || seen.has(urls[0]!)) continue
    const titleNode = nodes.find(n => hasClass(n, unesco ? 'h5' : 'ecl-content-block__title'))
    const title = titleNode ? clean(titleNode) : ''
    if (!title) continue
    const dateNodes = nodes.filter(n => unesco ? n.tagName === 'time' : hasClass(n, 'ecl-content-block__primary-meta-item'))
    const dates = dateNodes.map(clean).filter(t => /^\d{1,2} [A-Za-z]+ \d{4}$/.test(t))
    let publishedAt: string | null = null, invalid = false
    if (dates.length === 1) {
      try { publishedAt = `${institutionalPublicationDate(dates[0]!)}T00:00:00.000Z` } catch { invalid = true }
    } else if (dates.length > 1) invalid = true
    seen.add(urls[0]!)
    candidates.push({ sourceId: plan.sourceId, sourceName: plan.sourceName, sourceRole: plan.sourceRole,
      editorialTrust: plan.editorialTrust, citationMode: plan.citationMode, feedUrl: plan.feedUrl,
      title, concreteUrl: urls[0]!, publishedAt, ...(invalid ? { publicationDateInvalid: true as const } : {}), summary: null })
  }
  return candidates
}
export function extractUnescoArticle(source: string, finalUrl: string, html: string): FlashHtmlArticleExtraction {
  if (host(new URL(source)) !== 'unesco.org' || !institutionalArticleUrl(source, finalUrl)) throw new Error('Unsupported UNESCO article URL.')
  const all = elements(parse(html))
  type LayoutField = 'document' | 'main container' | 'headline' | 'original publication date' | 'description' | 'article body'
  const unsupported = (field: LayoutField): never => {
    throw new Error(`FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: ${field}`)
  }
  const one = (nodes: Element[], field: LayoutField) => {
    if (nodes.length !== 1 || !clean(nodes[0]!)) unsupported(field)
    return nodes[0]!
  }
  const lang = all.find(n => n.tagName === 'html')
  if (!lang || !/^en(?:-[a-z0-9]+)*$/i.test(attr(lang, 'lang') ?? '')) unsupported('document')
  const nodes = elements(one(all.filter(n => n.tagName === 'main'), 'main container'))
  const title = clean(one(nodes.filter(n => n.tagName === 'h1'), 'headline'))
  const publicationDate = clean(one(nodes.filter(n => hasClass(n, 'created-time')), 'original publication date'))
  institutionalPublicationDate(publicationDate)
  const lead = clean(one(nodes.filter(n => hasClass(n, 'field--name-field-description')), 'description'))
  const body = one(nodes.filter(n => hasClass(n, 'field--name-field-paragraphs')), 'article body')
  const bodyParagraphs = elements(body).filter(n => n.tagName === 'p' || n.tagName === 'li' && !elements(n).some(c => c.tagName === 'p')).map(clean).filter(Boolean)
  if (!bodyParagraphs.length) unsupported('article body')
  return { finalUrl, title, publicationDate, lead, contentType: 'INSTITUTIONAL NEWS', bodyParagraphs,
    bodyText: bodyParagraphs.join('\n\n'), sourceAdapter: 'unesco-education', leadKind: 'article-summary', provenanceParagraphs: [], primaryEvidenceUrls: [] }
}
