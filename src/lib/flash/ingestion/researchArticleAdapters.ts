import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'

export type ResearchArticleAdapter = 'google-research' | 'mit-news'
type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']

function host(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
}

/** Explicit source/path allowlist; fetching/DNS enforcement belongs to the retriever. */
export function researchArticleAdapterForUrl(
  registeredSourceUrl: string,
  finalUrl: string,
): ResearchArticleAdapter | null {
  const registered = new URL(registeredSourceUrl)
  const final = new URL(finalUrl)
  const sourceHost = host(registered)
  if (!['research.google', 'news.mit.edu'].includes(sourceHost)) return null
  for (const url of [registered, final]) {
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      throw new Error('Research article requires HTTPS without credentials or a custom port.')
    }
  }
  if (host(final) !== sourceHost) throw new Error('Research article must belong to the registered source host.')
  const adapter = sourceHost === 'research.google' ? 'google-research' : 'mit-news'
  const path = adapter === 'google-research'
    ? /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/
    : /^\/\d{4}\/[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}\/?$/
  if (!path.test(final.pathname) || /^\/blog\/rss\/?$/.test(final.pathname)) {
    throw new Error('Research article URL is not a supported article page.')
  }
  return adapter
}

function element(node: Node): node is Element { return 'tagName' in node }
function attr(node: Element, name: string): string | undefined {
  return node.attrs.find(item => item.name === name)?.value
}
function hasClass(node: Element, name: string): boolean {
  return (attr(node, 'class') ?? '').split(/\s+/).includes(name)
}
function excluded(node: Element): boolean {
  return ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside', 'figure', 'figcaption'].includes(node.tagName)
    || attr(node, 'hidden') !== undefined || attr(node, 'aria-hidden') === 'true'
    || ['caption', 'news-article--related-archive', 'news-article--recent-news--teaser'].some(name => hasClass(node, name))
}
function elements(node: Node): Element[] {
  if (element(node) && excluded(node)) return []
  return [
    ...(element(node) ? [node] : []),
    ...('childNodes' in node ? node.childNodes.flatMap(elements) : []),
  ]
}
function text(node: Node): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value
  if (element(node) && excluded(node)) return ''
  if (element(node) && node.tagName === 'br') return ' '
  return 'childNodes' in node ? node.childNodes.map(text).join('') : ''
}
function clean(node: Node): string { return text(node).replace(/\s+/g, ' ').trim() }
function required(value: string | undefined, field: string): string {
  if (!value?.trim()) throw new Error(`Research article is missing ${field}.`)
  return value.trim()
}
function one(nodes: Element[], field: string): Element {
  if (nodes.length !== 1) throw new Error(`Research article requires exactly one ${field}.`)
  return nodes[0]!
}
function insideClass(node: Element, className: string): boolean {
  let parent: Node | null = node
  while (parent) {
    if (element(parent) && hasClass(parent, className)) return true
    parent = 'parentNode' in parent ? parent.parentNode : null
  }
  return false
}

/** Parses inert HTML only: no script execution, resource loading, database, or AI. */
export function extractResearchArticle(
  registeredSourceUrl: string,
  finalUrlValue: string,
  html: string,
): FlashHtmlArticleExtraction {
  const adapter = researchArticleAdapterForUrl(registeredSourceUrl, finalUrlValue)
  if (!adapter) throw new Error('No research article adapter for this source.')
  const all = elements(parse(html))
  const language = attr(one(all.filter(node => node.tagName === 'html'), 'HTML document'), 'lang')
  if (!language || !/^en(?:-[a-z0-9]+)*$/i.test(language)) {
    throw new Error('Research article must declare an English document language.')
  }
  const main = one(all.filter(node => node.tagName === 'main'), 'main container')
  const mainNodes = elements(main)
  const title = required(clean(one(mainNodes.filter(node => node.tagName === 'h1'), 'title')), 'title')
  const google = adapter === 'google-research'
  const body = one(mainNodes.filter(node => hasClass(node, google
    ? 'blog-detail-wrapper' : 'news-article--content--body--inner')), 'article body')
  const dateNodes = google
    ? mainNodes.filter(node => node.tagName === 'p' && insideClass(node, 'basic-hero--blog-detail__description'))
    : mainNodes.filter(node => node.tagName === 'time')
  const dates = dateNodes.map(clean).filter(value => /^[A-Za-z]+ \d{1,2}, \d{4}$/.test(value))
  if (dates.length !== 1) throw new Error('Research article requires exactly one publication date.')
  const publicationDate = dates[0]!
  // Validate calendar dates during extraction as well as downstream normalization.
  normalizeResearchPublicationDate(publicationDate)
  const lead = google
    ? clean(one(mainNodes.filter(node => hasClass(node, 'blog-summary__summary')), 'lead'))
    : attr(one(all.filter(node => node.tagName === 'meta' && attr(node, 'name') === 'description'), 'description'), 'content')
  const bodyParagraphs: string[] = []
  const provenanceParagraphs: string[] = []
  let provenanceSection = false
  for (const node of elements(body)) {
    if (/^h[1-6]$/.test(node.tagName)) {
      provenanceSection = /^(acknowledg(?:e)?ments?|funding|disclosures?)\s*[:.]?$/i.test(clean(node))
    }
    if (node.tagName !== 'p' || (google && !insideClass(node, 'rich-text'))) continue
    const value = clean(node)
    if (!value) continue
    const funding = !google && /^The researchers[’'] work was supported\b/i.test(value)
    const target = provenanceSection || funding ? provenanceParagraphs : bodyParagraphs
    target.push(value)
  }
  if (!bodyParagraphs.length) throw new Error('Research article main body has no paragraphs.')
  const finalUrl = new URL(finalUrlValue)
  finalUrl.hash = ''
  return {
    finalUrl: finalUrl.toString(), title, publicationDate,
    lead: required(lead?.replace(/\s+/g, ' ').trim(), 'lead'),
    contentType: google ? 'RESEARCH BLOG' : 'NEWS ARTICLE',
    bodyParagraphs, bodyText: bodyParagraphs.join('\n\n'),
    sourceAdapter: adapter, provenanceParagraphs,
    leadKind: google ? 'article-summary' : 'meta-description',
  }
}

export function normalizeResearchPublicationDate(value: string): string {
  const match = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(value.trim())
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
  const month = match ? months.indexOf(match[1]!.toLowerCase()) : -1
  const day = Number(match?.[2])
  const year = Number(match?.[3])
  const date = new Date(Date.UTC(year, month, day))
  if (!match || month < 0 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new Error('Research article publication date is invalid or unsupported.')
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
