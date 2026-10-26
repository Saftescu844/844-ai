import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'
import { normalizeResearchPublicationDate } from './researchArticleAdapters'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
const isElement = (node: Node): node is Element => 'tagName' in node
const attr = (node: Element, key: string) => node.attrs.find(a => a.name === key)?.value
const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '')

/** Exact source and English article path; no localized pages or arbitrary subdomains. */
export function openAiNewsArticleUrl(source: string, value: string): string {
  const registered = new URL(source), url = new URL(value)
  for (const item of [registered, url]) {
    if (item.protocol !== 'https:' || item.username || item.password || item.port || host(item) !== 'openai.com') {
      throw new Error('Unsupported OpenAI article origin.')
    }
  }
  if (!/^\/index\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(url.pathname)) {
    throw new Error('Unsupported OpenAI article path.')
  }
  url.search = ''; url.hash = ''
  return url.toString()
}

function excluded(node: Element) {
  return ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside', 'figure',
    'figcaption', 'button', 'form', 'pre', 'code'].includes(node.tagName) ||
    attr(node, 'hidden') !== undefined || attr(node, 'aria-hidden') === 'true'
}
function elements(node: Node): Element[] {
  if (isElement(node) && excluded(node)) return []
  return [...(isElement(node) ? [node] : []), ...('childNodes' in node ? node.childNodes.flatMap(elements) : [])]
}
function text(node: Node): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value
  if (isElement(node) && excluded(node)) return ''
  if (isElement(node) && node.tagName === 'br') return ' '
  return 'childNodes' in node ? node.childNodes.map(text).join('') : ''
}
const clean = (node: Node) => text(node).replace(/\s+/g, ' ').trim()
function one(nodes: Element[], field: string) {
  if (nodes.length !== 1) throw new Error(`FLASH_OPENAI_ARTICLE_LAYOUT_UNSUPPORTED: ${field}`)
  return nodes[0]!
}

/** Observed standard OpenAI article template. Custom heroes without original dates fail closed. */
export function extractOpenAiNewsArticle(source: string, value: string, html: string): FlashHtmlArticleExtraction {
  const finalUrl = openAiNewsArticleUrl(source, value)
  const all = elements(parse(html))
  const document = one(all.filter(n => n.tagName === 'html'), 'document')
  if (!/^en(?:-[a-z0-9]+)*$/i.test(attr(document, 'lang') ?? '')) throw new Error('OpenAI article must declare English.')
  const canonical = attr(one(all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'canonical URL'), 'href')
  if (!canonical || openAiNewsArticleUrl(source, canonical).replace(/\/$/, '') !== finalUrl.replace(/\/$/, '')) {
    throw new Error('OpenAI article canonical URL does not match the retrieved article.')
  }
  const main = one(all.filter(n => n.tagName === 'main'), 'main container')
  const article = one(elements(main).filter(n => n.tagName === 'article'), 'article container')
  const nodes = elements(article)
  const title = clean(one(nodes.filter(n => n.tagName === 'h1' && attr(n, 'data-article-hero-copy-region') === 'headline'), 'headline'))
  const meta = one(nodes.filter(n => attr(n, 'data-article-hero-copy-region') === 'meta'), 'publication region')
  const dates = elements(meta).filter(n => n.tagName === 'p').map(clean)
    .filter(t => /^[A-Za-z]+ \d{1,2}, \d{4}$/.test(t))
  if (dates.length !== 1) throw new Error('FLASH_OPENAI_ARTICLE_LAYOUT_UNSUPPORTED: original publication date')
  const publicationDate = dates[0]!
  normalizeResearchPublicationDate(publicationDate)
  const subheads = nodes.filter(n => attr(n, 'data-article-hero-copy-region') === 'subhead')
  if (subheads.length > 1) throw new Error('OpenAI article has ambiguous subheads.')
  const description = all.filter(n => n.tagName === 'meta' && attr(n, 'name') === 'description')
  const lead = subheads.length ? clean(subheads[0]!) : attr(one(description, 'description'), 'content')?.trim()
  const body = one(nodes.filter(n => attr(n, 'data-toc-content') !== undefined), 'article body')
  const bodyParagraphs = elements(body).filter(n => n.tagName === 'p' ||
    n.tagName === 'li' && !elements(n).slice(1).some(c => ['p', 'li'].includes(c.tagName))).map(clean).filter(Boolean)
  if (!title || !lead || !bodyParagraphs.length) throw new Error('OpenAI article is missing editorial text.')
  return { finalUrl, title, publicationDate, lead, bodyParagraphs, bodyText: bodyParagraphs.join('\n\n'),
    contentType: 'COMPANY NEWS', sourceAdapter: 'openai-news',
    leadKind: subheads.length ? 'article-summary' : 'meta-description',
    provenanceParagraphs: [], primaryEvidenceUrls: [] }
}
