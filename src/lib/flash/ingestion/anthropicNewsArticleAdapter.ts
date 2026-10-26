import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'
import type { FlashRssCandidate, FlashRssIngestionSourcePlan } from './rssCandidateIngestion'
import { flashPublicationTimestamp } from './flashPublicationFreshness'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value
const component = (n: Element, name: string, part: string) => (attr(n, 'class') ?? '').split(/\s+/)
  .some(token => token.startsWith(`${name}-`) && token.endsWith(`__${part}`))
const excluded = (n: Element) => ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside',
  'figure', 'figcaption', 'button', 'form', 'pre', 'code'].includes(n.tagName) ||
  attr(n, 'hidden') !== undefined || attr(n, 'inert') !== undefined || attr(n, 'aria-hidden') === 'true'
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
function one(nodes: Element[], field: string) {
  if (nodes.length !== 1) throw new Error(`FLASH_ANTHROPIC_ARTICLE_LAYOUT_UNSUPPORTED: ${field}`)
  return nodes[0]!
}
const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '')
export function anthropicNewsArticleUrl(source: string, value: string): string {
  const registered = new URL(source), url = new URL(value, source)
  for (const item of [registered, url]) {
    if (item.protocol !== 'https:' || item.username || item.password || item.port || host(item) !== 'anthropic.com') {
      throw new Error('Unsupported Anthropic article origin.')
    }
  }
  if (!/^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(url.pathname)) throw new Error('Unsupported Anthropic article path.')
  url.hostname = registered.hostname.toLowerCase()
  url.pathname = url.pathname.replace(/\/$/, '')
  url.search = ''; url.hash = ''
  return url.toString()
}

/** Visible original dates only; datetime attributes may corroborate, never replace them. */
export function normalizeAnthropicPublicationDate(value: string): string {
  const match = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(value.trim())
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const month = match ? months.findIndex(m => m === match[1]!.toLowerCase() || m.slice(0, 3) === match[1]!.toLowerCase()) + 1 : 0
  const iso = match && month ? `${match[3]}-${String(month).padStart(2, '0')}-${match[2]!.padStart(2, '0')}` : ''
  if (flashPublicationTimestamp(iso) === null) throw new Error('Anthropic original publication date is invalid or missing.')
  return iso
}

export function parseAnthropicNewsCandidates(plan: FlashRssIngestionSourcePlan, html: string): FlashRssCandidate[] {
  const all = elements(parse(html))
  if (!/^en(?:-[a-z0-9]+)*$/i.test(attr(one(all.filter(n => n.tagName === 'html'), 'document'), 'lang') ?? '')) {
    throw new Error('Anthropic listing must declare English.')
  }
  const nodes = elements(one(all.filter(n => n.tagName === 'main'), 'main container'))
  const rows = nodes.filter(n => component(n, 'TableView', 'summary'))
  if (!rows.length) throw new Error('Anthropic listing has no supported summary rows.')
  const seen = new Set<string>(), candidates: FlashRssCandidate[] = []
  for (const row of rows.slice(0, 50)) {
    const parts = elements(row)
    const titles = parts.filter(n => n.tagName === 'a' && component(n, 'TableView', 'title-link'))
    if (titles.length !== 1 || !clean(titles[0]!)) continue
    let url: string
    try { url = anthropicNewsArticleUrl(plan.registeredSourceUrl, attr(titles[0]!, 'href') ?? '') } catch { continue }
    if (seen.has(url)) continue
    const dates = parts.filter(n => component(n, 'TableView', 'date'))
    let publishedAt: string | null = null, invalid = dates.length > 1
    if (dates.length === 1 && clean(dates[0]!)) {
      try { publishedAt = `${normalizeAnthropicPublicationDate(clean(dates[0]!))}T00:00:00.000Z` } catch { invalid = true }
    }
    seen.add(url)
    candidates.push({ sourceId: plan.sourceId, sourceName: plan.sourceName, sourceRole: plan.sourceRole,
      editorialTrust: plan.editorialTrust, citationMode: plan.citationMode, feedUrl: plan.feedUrl!,
      title: clean(titles[0]!), concreteUrl: url, publishedAt,
      ...(invalid ? { publicationDateInvalid: true as const } : {}), summary: null })
  }
  return candidates
}

export function extractAnthropicNewsArticle(source: string, value: string, html: string): FlashHtmlArticleExtraction {
  const finalUrl = anthropicNewsArticleUrl(source, value)
  const all = elements(parse(html))
  if (!/^en(?:-[a-z0-9]+)*$/i.test(attr(one(all.filter(n => n.tagName === 'html'), 'document'), 'lang') ?? '')) {
    throw new Error('Anthropic article must declare English.')
  }
  const canonical = attr(one(all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'canonical URL'), 'href')
  if (!canonical || anthropicNewsArticleUrl(source, canonical).replace(/\/$/, '') !== finalUrl.replace(/\/$/, '')) {
    throw new Error('Anthropic canonical URL does not match the retrieved article.')
  }
  const main = one(all.filter(n => n.tagName === 'main'), 'main container')
  const article = one(elements(main).filter(n => n.tagName === 'article' && component(n, 'ArticlePage', 'Article')), 'article container')
  const nodes = elements(article)
  const title = clean(one(nodes.filter(n => n.tagName === 'h1' && component(n, 'ArticleHero', 'Title')), 'headline'))
  const published = nodes.filter(n => component(n, 'ArticleHero', 'Metadata') &&
    elements(n).some(c => c.tagName === 'p' && clean(c) === 'Published'))
  const time = one(elements(one(published, 'publication region')).filter(n => n.tagName === 'time'), 'original publication date')
  const publicationDate = clean(time), iso = normalizeAnthropicPublicationDate(publicationDate)
  if (attr(time, 'datetime') && attr(time, 'datetime') !== iso) throw new Error('Anthropic publication date attributes conflict with the visible original date.')
  const body = one(nodes.filter(n => attr(n, 'data-article-body') === 'true'), 'article body')
  const bodyParagraphs = elements(body).filter(n => n.tagName === 'p' || n.tagName === 'li' &&
    !elements(n).slice(1).some(c => ['p', 'li'].includes(c.tagName))).map(clean).filter(Boolean)
  if (!title || !bodyParagraphs.length) throw new Error('Anthropic article is missing editorial text.')
  return { finalUrl, title, publicationDate, lead: bodyParagraphs[0]!, bodyParagraphs,
    bodyText: bodyParagraphs.join('\n\n'), contentType: 'COMPANY NEWS', sourceAdapter: 'anthropic-news',
    leadKind: 'article-summary', provenanceParagraphs: [], primaryEvidenceUrls: [] }
}
