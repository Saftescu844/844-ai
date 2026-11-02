import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value
const hasClass = (n: Element, name: string) => (attr(n, 'class') ?? '').split(/\s+/).includes(name)
const excluded = (n: Element) => ['script', 'style', 'template', 'noscript', 'nav', 'footer', 'aside',
  'figure', 'figcaption', 'button', 'form', 'pre', 'code'].includes(n.tagName) ||
  attr(n, 'hidden') !== undefined || attr(n, 'inert') !== undefined || attr(n, 'aria-hidden') === 'true' ||
  n.tagName === 'ul' && hasClass(n, 'links')
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
function one(nodes: Element[], field: string): Element {
  if (nodes.length !== 1) throw new Error(`FLASH_RO_EDUCATION_ARTICLE_LAYOUT_UNSUPPORTED: ${field}`)
  return nodes[0]!
}
const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '')

/** Only the observed Ministry press-release namespace, never the whole education site. */
export function romanianEducationArticleUrl(source: string, value: string): string {
  const registered = new URL(source), url = new URL(value, source)
  for (const item of [registered, url]) {
    if (item.protocol !== 'https:' || item.username || item.password || item.port || host(item) !== 'edu.ro') {
      throw new Error('Unsupported Romanian Education article origin.')
    }
  }
  if (!/^\/press_rel_[a-z0-9]+(?:[_-][a-z0-9]+)*\/?$/.test(url.pathname)) {
    throw new Error('Unsupported Romanian Education article path.')
  }
  url.hostname = registered.hostname.toLowerCase()
  url.pathname = url.pathname.replace(/\/$/, '')
  url.search = ''; url.hash = ''
  return url.toString()
}

/** General education/digitalisation is insufficient; require an explicit AI topic. */
export function romanianEducationHasAiRelevance(value: string): boolean {
  const normalized = value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  return /\b(?:inteligent(?:a|ei) artificial[ae]|artificial intelligence|invatare automata|machine learning|(?:ia|ai) generativa?|generative ai|modele? lingvistice?|chatgpt|copilot)\b/.test(normalized)
}

/** Original visible publication date only. Never substitute a crawl/modified timestamp. */
export function normalizeRomanianEducationPublicationDate(value: string): string {
  const match = /^(\d{1,2}) ([a-zăâîșț]+) (\d{4})$/i.exec(value.trim())
  const months = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
  const month = match ? months.indexOf(match[2]!.toLowerCase()) : -1
  const day = Number(match?.[1]), year = Number(match?.[3])
  const date = new Date(Date.UTC(year, month, day))
  if (!match || month < 0 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new Error('Romanian Education original publication date is invalid or missing.')
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Inert, scoped parsing; no network, scripts, models or persistence. */
export function extractRomanianEducationArticle(source: string, value: string, html: string): FlashHtmlArticleExtraction {
  const finalUrl = romanianEducationArticleUrl(source, value)
  const all = elements(parse(html))
  if (!/^ro(?:-[a-z0-9]+)*$/i.test(attr(one(all.filter(n => n.tagName === 'html'), 'document'), 'lang') ?? '')) {
    throw new Error('Romanian Education article must declare Romanian.')
  }
  const canonical = attr(one(all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'canonical URL'), 'href')
  if (!canonical || romanianEducationArticleUrl(source, canonical) !== finalUrl) {
    throw new Error('Romanian Education canonical URL does not match the retrieved article.')
  }
  const main = elements(one(all.filter(n => n.tagName === 'main'), 'main container'))
  const titleRegion = one(main.filter(n => attr(n, 'id') === 'block-edu-page-title'), 'headline')
  const title = clean(one(elements(titleRegion).filter(n => n.tagName === 'h1'), 'headline'))
  const article = elements(one(main.filter(n => n.tagName === 'article' && hasClass(n, 'edu-article')), 'article container'))
  const date = one(article.filter(n => hasClass(n, 'edu-article__date')), 'original publication date')
  const visibleDate = /^Data publicării (.+)$/.exec(clean(date))
  const publicationDate = visibleDate?.[1] ?? ''
  const iso = normalizeRomanianEducationPublicationDate(publicationDate)
  for (const time of elements(date).filter(n => n.tagName === 'time')) {
    const datetime = attr(time, 'datetime')
    if (datetime && (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(datetime) ||
      !Number.isFinite(Date.parse(datetime)) || datetime.slice(0, 10) !== iso)) {
      throw new Error('Romanian Education publication date conflicts with the visible original date.')
    }
  }
  const body = one(article.filter(n => hasClass(n, 'edu-article__body')), 'article body')
  const bodyParagraphs = elements(body).filter(n => n.tagName === 'p' || n.tagName === 'li' &&
    !elements(n).slice(1).some(c => ['p', 'li'].includes(c.tagName))).map(clean).filter(Boolean)
  if (!title || !bodyParagraphs.length) throw new Error('Romanian Education article is missing editorial text.')
  if (!romanianEducationHasAiRelevance([title, ...bodyParagraphs].join(' '))) {
    throw new Error('Romanian Education article has no explicit AI relevance.')
  }
  return { finalUrl, title, publicationDate, lead: bodyParagraphs[0]!, bodyParagraphs,
    bodyText: bodyParagraphs.join('\n\n'), contentType: 'PRESS RELEASE', sourceAdapter: 'ro-education',
    leadKind: 'article-summary', provenanceParagraphs: [], primaryEvidenceUrls: [] }
}
