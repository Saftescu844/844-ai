import { extractUnescoArticle, institutionalArticleUrl } from './institutionalHtmlDiscovery'
import { extractOpenAiNewsArticle, openAiNewsArticleUrl } from './openAiNewsArticleAdapter'
import { extractAnthropicNewsArticle, anthropicNewsArticleUrl } from './anthropicNewsArticleAdapter'
import { extractMicrosoftResearchArticle, microsoftResearchArticleUrl } from './microsoftResearchArticleAdapter'
import { parse, type DefaultTreeAdapterMap } from 'parse5'
import type { FlashHtmlArticleExtraction } from './htmlArticleExtraction'

export type ResearchArticleAdapter = 'google-research' | 'mit-news' | 'unesco-education' | 'openai-news' | 'anthropic-news' | 'microsoft-research' | 'fda-safety' | 'fda-recall'
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
  if (sourceHost === 'fda.gov') {
    if ([registered, final].some(url => url.protocol !== 'https:' || url.username || url.password || url.port) ||
        host(final) !== sourceHost ||
        !/^\/medical-devices\/(?:safety-communications|medical-device-recalls-and-early-alerts)\/[a-z0-9-]+\/?$/.test(final.pathname)) {
      throw new Error('Unsupported FDA safety communication URL.')
    }
    return final.pathname.startsWith('/medical-devices/safety-communications/') ? 'fda-safety' : 'fda-recall'
  }
  if (sourceHost === 'microsoft.com') {
    microsoftResearchArticleUrl(registeredSourceUrl, finalUrl)
    return 'microsoft-research'
  }
  if (sourceHost === 'anthropic.com') {
    anthropicNewsArticleUrl(registeredSourceUrl, finalUrl)
    return 'anthropic-news'
  }
  if (sourceHost === 'openai.com') {
    openAiNewsArticleUrl(registeredSourceUrl, finalUrl)
    return 'openai-news'
  }
  if (sourceHost === 'unesco.org') {
    if (!institutionalArticleUrl(registeredSourceUrl, finalUrl)) throw new Error('Unsupported UNESCO article URL.')
    return 'unesco-education'
  }
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

function normalizeArxivEvidenceUrl(
  value: string,
  baseUrl: string,
): string | null {
  let url: URL

  try {
    url = new URL(value, baseUrl)
  } catch {
    return null
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    host(url) !== 'arxiv.org'
  ) {
    return null
  }

  const match = /^\/abs\/(\d{4}\.\d{4,5})(?:v\d+)?\/?$/.exec(url.pathname)
  if (!match?.[1]) return null

  url.pathname = `/abs/${match[1]}`
  url.search = ''
  url.hash = ''

  return url.toString()
}

function normalizeNberPaperEvidenceUrl(
  value: string,
  baseUrl: string,
): string | null {
  let url: URL

  try {
    url = new URL(value, baseUrl)
  } catch {
    return null
  }

  const match = /^\/papers\/(w\d{4,9})\/?$/i.exec(url.pathname)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    host(url) !== 'nber.org' ||
    !match?.[1]
  ) {
    return null
  }

  // NBER's own working-paper identifier, never a guess from title/date.
  return `https://www.nber.org/papers/${match[1].toLowerCase()}`
}

function normalizeDoiPaperEvidenceUrl(
  value: string,
  baseUrl: string,
): string | null {
  let url: URL

  try {
    url = new URL(value, baseUrl)
  } catch {
    return null
  }

  // Require an explicit MIT primary Paper link to the DOI authority.
  // An IEEE document number alone cannot establish a DOI identity.
  const match = /^\/(10\.\d{4,9}\/[a-z0-9][a-z0-9._;():+\/-]{0,200})\/?$/i.exec(url.pathname)
  if (
    url.protocol !== 'https:' ||
    url.username || url.password || url.port ||
    host(url) !== 'doi.org' ||
    !match?.[1]
  ) {
    return null
  }

  return `https://doi.org/${match[1].toLowerCase()}`
}

function normalizeIeeeXplorePaperEvidenceUrl(
  value: string,
  baseUrl: string,
): string | null {
  let url: URL

  try {
    url = new URL(value, baseUrl)
  } catch {
    return null
  }

  // The number is an IEEE Xplore DOCUMENT identifier, not a DOI.
  // Only an explicitly labelled primary MIT Paper link can supply it.
  const match = /^\/document\/([1-9]\d{6,9})\/?$/.exec(url.pathname)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    host(url) !== 'ieeexplore.ieee.org' ||
    !match?.[1]
  ) {
    return null
  }

  return `https://ieeexplore.ieee.org/document/${match[1]}`
}

function extractPrimaryEvidenceUrls(
  nodes: Element[],
  adapter: ResearchArticleAdapter,
  baseUrl: string,
): string[] {
  const urls = new Set<string>()

  for (const node of nodes) {
    if (node.tagName !== 'a') continue

    const linkText = clean(node)
    // MIT also writes "Paper: <linked title>". Use the explicit label
    // only if its paragraph has exactly one link; unrelated citations
    // and navigation links must never become primary evidence.
    let parent: Node | null = 'parentNode' in node ? node.parentNode : null
    while (parent && (!element(parent) || parent.tagName !== 'p')) {
      parent = 'parentNode' in parent ? parent.parentNode : null
    }
    const labelledMitParagraph =
      adapter === 'mit-news' &&
      parent && element(parent) &&
      /^paper\s*:/i.test(clean(parent)) &&
      elements(parent).filter(item => item.tagName === 'a').length === 1

    const isPrimaryLabel = adapter === 'google-research'
      ? /^(?:tech report|paper)$/i.test(linkText)
      : /^paper(?:\b|\s*:)/i.test(linkText) || labelledMitParagraph

    if (!isPrimaryLabel) continue

    const href = attr(node, 'href')
    if (!href) continue

    const normalized = normalizeArxivEvidenceUrl(href, baseUrl)
      ?? (adapter === 'google-research'
        ? normalizeNberPaperEvidenceUrl(href, baseUrl)
        : normalizeDoiPaperEvidenceUrl(href, baseUrl)
          ?? normalizeIeeeXplorePaperEvidenceUrl(href, baseUrl))
    if (normalized) urls.add(normalized)
  }

  if (urls.size > 1) {
    throw new Error('Research article has multiple distinct primary research evidence links.')
  }

  return [...urls]
}

function extractFdaArticle(all: Element[], finalUrlValue: string, adapter: 'fda-safety' | 'fda-recall'): FlashHtmlArticleExtraction {
  const finalUrl = new URL(finalUrlValue)
  finalUrl.hash = ''
  finalUrl.search = ''
  const canonical = attr(one(all.filter(node => node.tagName === 'link' &&
    attr(node, 'rel') === 'canonical'), 'FDA canonical URL'), 'href')
  if (canonical !== finalUrl.href) throw new Error('FDA canonical URL does not match the retrieved article.')

  const title = required(clean(one(all.filter(node => node.tagName === 'h1' &&
    hasClass(node, 'content-title')), 'FDA title')), 'FDA title')
  const body = one(all.filter(node => attr(node, 'role') === 'main'), 'FDA article body')
  if (adapter === 'fda-recall') return extractFdaRecall(all, body, finalUrl, title)
  const blocks = elements(body).filter(node => ['p', 'li', 'h2', 'h3'].includes(node.tagName)).map(clean).filter(Boolean)
  const issued = blocks.findIndex(value => /^Date Issued:/i.test(value))
  if (issued < 0) throw new Error('FDA article is missing its issue date.')
  const publicationDate = blocks[issued]!.replace(/^Date Issued:\s*/i, '')
  normalizeResearchPublicationDate(publicationDate)
  const lead = required(blocks[issued + 1], 'FDA lead')
  // FDA may put a correction notice before the original issue date.
  const bodyParagraphs = blocks.filter((_, index) => index !== issued)
  return {
    finalUrl: finalUrl.href, title, publicationDate, lead, bodyParagraphs,
    bodyText: bodyParagraphs.join('\n\n'), contentType: 'FDA SAFETY COMMUNICATION',
    sourceAdapter: 'fda-safety', leadKind: 'article-summary',
  }
}

function extractFdaRecall(all: Element[], body: Element, url: URL, title: string): FlashHtmlArticleExtraction {
  const nodes = elements(body)
  const sections = ['Affected Product', 'What to Do', 'Reason for Recall'].map(heading => {
    const start = nodes.indexOf(one(nodes.filter(node => node.tagName === 'h2' && clean(node) === heading), heading))
    const end = nodes.findIndex((node, index) => index > start && node.tagName === 'h2')
    const content = nodes.slice(start + 1, end < 0 ? undefined : end)
    const blocks = content.filter(node => ['p', 'li', 'h3'].includes(node.tagName)).map(clean).filter(Boolean)
    if (!blocks.length) throw new Error(`FDA recall has an empty ${heading} section.`)
    return { content, paragraphs: [heading, ...blocks] }
  })

  const lotLinks = sections[0]!.content.filter(node => node.tagName === 'a' &&
    /^full list of affected products?$/i.test(clean(node)))
  const href = required(attr(one(lotLinks, 'FDA affected product list link'), 'href'), 'FDA affected product list URL')
  const lotsUrl = new URL(href, url)
  if (lotsUrl.origin !== url.origin || lotsUrl.username || lotsUrl.password ||
      !/^\/media\/\d+\/download\/?$/.test(lotsUrl.pathname)) {
    throw new Error('FDA affected product list must be an official FDA download.')
  }

  const dateNode = one(all.filter(node => node.tagName === 'meta' &&
    attr(node, 'property') === 'article:published_time'), 'FDA publication metadata')
  const date = /^(?:[A-Za-z]{3}, )?(\d{2})\/(\d{2})\/(\d{4})(?: - \d{2}:\d{2})?$/.exec(attr(dateNode, 'content') ?? '')
  if (!date) throw new Error('FDA recall publication date has an unsupported format.')
  const iso = `${date[3]}-${date[1]}-${date[2]}`
  const timestamp = new Date(`${iso}T00:00:00Z`)
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== iso) {
    throw new Error('FDA recall publication date is invalid.')
  }
  const publicationDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
  }).format(timestamp)
  const bodyParagraphs = sections.flatMap(section => section.paragraphs)
  return {
    finalUrl: url.href, title, publicationDate, lead: bodyParagraphs[1]!,
    bodyParagraphs, bodyText: bodyParagraphs.join('\n\n'), contentType: 'FDA DEVICE RECALL',
    sourceAdapter: 'fda-recall', leadKind: 'article-summary', primaryEvidenceUrls: [lotsUrl.href],
  }
}

/** Parses inert HTML only: no script execution, resource loading, database, or AI. */
export function extractResearchArticle(
  registeredSourceUrl: string,
  finalUrlValue: string,
  html: string,
): FlashHtmlArticleExtraction {
  const adapter = researchArticleAdapterForUrl(registeredSourceUrl, finalUrlValue)
  if (!adapter) throw new Error('No research article adapter for this source.')
  if (adapter === 'unesco-education') return extractUnescoArticle(registeredSourceUrl, finalUrlValue, html)
  if (adapter === 'openai-news') return extractOpenAiNewsArticle(registeredSourceUrl, finalUrlValue, html)
  if (adapter === 'microsoft-research') return extractMicrosoftResearchArticle(registeredSourceUrl, finalUrlValue, html)
  if (adapter === 'anthropic-news') return extractAnthropicNewsArticle(registeredSourceUrl, finalUrlValue, html)
  const all = elements(parse(html))
  if (adapter === 'fda-safety' || adapter === 'fda-recall') return extractFdaArticle(all, finalUrlValue, adapter)
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
  const primaryEvidenceUrls = extractPrimaryEvidenceUrls(mainNodes, adapter, finalUrlValue)
  const finalUrl = new URL(finalUrlValue)
  finalUrl.hash = ''
  return {
    finalUrl: finalUrl.toString(), title, publicationDate,
    lead: required(lead?.replace(/\s+/g, ' ').trim(), 'lead'),
    contentType: google ? 'RESEARCH BLOG' : 'NEWS ARTICLE',
    bodyParagraphs, bodyText: bodyParagraphs.join('\n\n'),
    sourceAdapter: adapter, provenanceParagraphs,
    leadKind: google ? 'article-summary' : 'meta-description',
    primaryEvidenceUrls,
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
