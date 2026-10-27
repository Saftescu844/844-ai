import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'
import { flashPublicationTimestamp } from './flashPublicationFreshness'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value
const hasClass = (n: Element, value: string) => (attr(n, 'class') ?? '').split(/\s+/).includes(value)
const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '')

/** Microsoft is a broad host: require the English Research registration and blog path. */
export function microsoftResearchArticleUrl(source: string, value: string): string {
  const registered = new URL(source), url = new URL(value, source)
  for (const item of [registered, url]) {
    if (item.protocol !== 'https:' || item.username || item.password || item.port || host(item) !== 'microsoft.com') {
      throw new Error('Unsupported Microsoft Research article origin.')
    }
  }
  if (!/^\/en-us\/research\/?$/.test(registered.pathname) ||
      !/^\/en-us\/research\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(url.pathname)) {
    throw new Error('Unsupported Microsoft Research article path.')
  }
  url.hostname = registered.hostname.toLowerCase()
  url.pathname = `${url.pathname.replace(/\/$/, '')}/`
  url.search = ''; url.hash = ''
  return url.toString()
}

const excluded = (n: Element) => ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside',
  'figure', 'figcaption', 'button', 'form', 'pre', 'code'].includes(n.tagName) ||
  attr(n, 'hidden') !== undefined || attr(n, 'inert') !== undefined || attr(n, 'aria-hidden') === 'true' ||
  ['msr-promo', 'sr-only', 'screen-reader-text'].some(c => hasClass(n, c))
function elements(n: Node, publicationSidebar = false): Element[] {
  if ('tagName' in n && excluded(n) && !(publicationSidebar && n.tagName === 'aside' &&
      hasClass(n, 'col-12') && hasClass(n, 'col-md-3') && attr(n, 'hidden') === undefined &&
      attr(n, 'inert') === undefined && attr(n, 'aria-hidden') !== 'true' &&
      !['msr-promo', 'sr-only', 'screen-reader-text'].some(c => hasClass(n, c)))) return []
  return [...('tagName' in n ? [n] : []), ...('childNodes' in n ? n.childNodes.flatMap(c => elements(c, publicationSidebar)) : [])]
}
function text(n: Node): string {
  if (n.nodeName === '#text') return (n as DefaultTreeAdapterMap['textNode']).value
  if ('tagName' in n && excluded(n)) return ''
  if ('tagName' in n && n.tagName === 'br') return ' '
  return 'childNodes' in n ? n.childNodes.map(text).join('') : ''
}
const clean = (n: Node) => text(n).replace(/\s+/g, ' ').trim()
function one(nodes: Element[], field: string): Element {
  if (nodes.length !== 1) throw new Error(`FLASH_MICROSOFT_RESEARCH_ARTICLE_LAYOUT_UNSUPPORTED: ${field}`)
  return nodes[0]!
}
function publicationDay(value: string): string {
  const match = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(value)
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const month = match ? months.indexOf(match[1]!.toLowerCase()) + 1 : 0
  const iso = match && month ? `${match[3]}-${String(month).padStart(2, '0')}-${match[2]!.padStart(2, '0')}` : ''
  if (flashPublicationTimestamp(iso) === null) throw new Error('Microsoft Research original publication date is invalid or missing.')
  return iso
}

/** Inert HTML extraction; no secondary publication-page requests or guessed paper identifiers. */
export function extractMicrosoftResearchArticle(source: string, value: string, html: string): FlashHtmlArticleExtraction {
  const finalUrl = microsoftResearchArticleUrl(source, value)
  const all = elements(parse(html))
  if (!/^en(?:-[a-z0-9]+)*$/i.test(attr(one(all.filter(n => n.tagName === 'html'), 'document'), 'lang') ?? '')) {
    throw new Error('Microsoft Research article must declare English.')
  }
  const canonical = attr(one(all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'canonical URL'), 'href')
  if (!canonical || microsoftResearchArticleUrl(source, canonical) !== finalUrl) {
    throw new Error('Microsoft Research canonical URL does not match the retrieved article.')
  }
  const main = one(all.filter(n => n.tagName === 'main'), 'main container')
  if (attr(main, 'itemtype') !== 'https://schema.org/BlogPosting') throw new Error('Microsoft Research page is not a research blog post.')
  const nodes = elements(main)
  const title = clean(one(nodes.filter(n => n.tagName === 'h1' && attr(n, 'itemprop') === 'headline'), 'headline'))
  const time = one(nodes.filter(n => n.tagName === 'time' && attr(n, 'itemprop') === 'datePublished'), 'original publication date')
  const publicationDate = clean(time), day = publicationDay(publicationDate)
  const datetime = attr(time, 'datetime') ?? ''
  // Compare the source's calendar day, not its UTC conversion across time zones.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(datetime) ||
      !Number.isFinite(Date.parse(datetime)) || datetime.slice(0, 10) !== day) {
    throw new Error('Microsoft Research publication date attributes conflict with the visible original date.')
  }
  const body = one(nodes.filter(n => attr(n, 'itemprop') === 'articleBody' && hasClass(n, 'single-post__content')), 'article body')
  const bodyParagraphs = elements(body).filter(n => n.tagName === 'p' || n.tagName === 'li' &&
    !elements(n).slice(1).some(c => ['p', 'li'].includes(c.tagName))).map(clean).filter(Boolean)
  if (!title || !bodyParagraphs.length) throw new Error('Microsoft Research article is missing editorial text.')
  return { finalUrl, title, publicationDate, lead: bodyParagraphs[0]!, bodyParagraphs,
    bodyText: bodyParagraphs.join('\n\n'), contentType: 'RESEARCH BLOG', sourceAdapter: 'microsoft-research',
    leadKind: 'article-summary', provenanceParagraphs: [], primaryEvidenceUrls: [] }
}

/** Follow only an explicit primary-paper label inside the validated blog body. */
export function microsoftResearchPaperReference(source: string, value: string, html: string):
  { status: 'missing_label' | 'ambiguous_links' | 'unsupported_link'; url: null } |
  { status: 'publication_page'; url: string } {
  extractMicrosoftResearchArticle(source, value, html)
  const all = elements(parse(html))
  const body = one(all.filter(n => attr(n, 'itemprop') === 'articleBody' && hasClass(n, 'single-post__content')), 'article body')
  const urls = new Set(elements(body).filter(n => n.tagName === 'a' && /^(?:paper|technical report|tech report)$/i.test(clean(n)))
    .map(n => attr(n, 'href') ?? ''))
  if (!urls.size) return { status: 'missing_label', url: null }
  if (urls.size !== 1) return { status: 'ambiguous_links', url: null }
  try { return { status: 'publication_page', url: microsoftResearchPublicationUrl(source, [...urls][0]!) } }
  catch { return { status: 'unsupported_link', url: null } }
}

export function microsoftResearchPublicationUrl(source: string, value: string): string {
  const url = new URL(value, source)
  if (!/^\/en-us\/research\/publication\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(url.pathname)) {
    throw new Error('Unsupported Microsoft Research publication path.')
  }
  // Reuse exactly the source/origin/credential boundary of the blog adapter.
  const blog = new URL(url)
  blog.pathname = blog.pathname.replace('/publication/', '/blog/')
  return microsoftResearchArticleUrl(source, blog.toString()).replace('/blog/', '/publication/')
}

/** A publisher's explicit Publication button establishes identity, never claim accuracy or peer review. */
export function extractMicrosoftResearchPublicationIdentity(source: string, value: string, html: string): {
  primaryEvidenceUrls: string[]; publicationDate: string | null; title: string
} {
  const url = microsoftResearchPublicationUrl(source, value), all = elements(parse(html), true)
  const language = attr(one(all.filter(n => n.tagName === 'html'), 'document'), 'lang') ?? ''
  if (!/^en(?:-[a-z0-9]+)*$/i.test(language)) throw new Error('Microsoft Research publication must declare English.')
  const canonical = attr(one(all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'canonical URL'), 'href')
  if (!canonical || microsoftResearchPublicationUrl(source, canonical) !== url) {
    throw new Error('Microsoft Research publication canonical URL does not match.')
  }
  const main = one(all.filter(n => n.tagName === 'main'), 'main container')
  if (!hasClass(main, 'single-publication')) throw new Error('Microsoft Research publication layout is unsupported.')
  // The observed publication template places its primary download buttons in this scoped sidebar.
  const nodes = elements(main, true), title = clean(one(nodes.filter(n => n.tagName === 'h1'), 'headline'))
  const citation = attr(one(all.filter(n => n.tagName === 'meta' && attr(n, 'name') === 'citation_title'), 'citation title'), 'content')
  if (!title || citation?.replace(/\s+/g, ' ').trim() !== title) throw new Error('Microsoft Research publication title conflicts with citation metadata.')
  const links = nodes.filter(n => n.tagName === 'a' && clean(n) === 'Publication' && hasClass(n, 'btn-primary'))
  const evidence = new Set<string>()
  for (const node of links) {
    let target: URL
    try { target = new URL(attr(node, 'href') ?? '', url) }
    catch { throw new Error('Unsupported Microsoft Research primary publication target.') }
    const match = /^\/abs\/(\d{4}\.\d{4,5})(?:v\d+)?\/?$/.exec(target.pathname)
    if (target.protocol !== 'https:' || target.hostname !== 'arxiv.org' || target.port || target.username || target.password || !match) {
      throw new Error('Unsupported Microsoft Research primary publication target.')
    }
    evidence.add(`https://arxiv.org/abs/${match[1]}`)
  }
  if (evidence.size > 1) throw new Error('Microsoft Research publication has ambiguous primary identifiers.')
  const dates = all.filter(n => n.tagName === 'meta' && attr(n, 'name') === 'citation_publication_date')
  const raw = dates.length === 1 ? attr(dates[0]!, 'content') ?? '' : ''
  const day = /^\d{4}\/\d{2}\/\d{2}$/.test(raw) ? raw.replaceAll('/', '-') : ''
  return { primaryEvidenceUrls: [...evidence], title,
    // Citation date is diagnostic metadata. It never replaces the blog's visible original date.
    publicationDate: flashPublicationTimestamp(day) !== null ? day : null }
}
