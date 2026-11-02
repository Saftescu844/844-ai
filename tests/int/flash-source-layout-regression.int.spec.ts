// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Surse } from '@/payload-types'
import { assessInstitutionalHtmlSource, extractUnescoArticle, parseInstitutionalHtmlCandidates } from '@/lib/flash/ingestion/institutionalHtmlDiscovery'
import { extractAnthropicNewsArticle } from '@/lib/flash/ingestion/anthropicNewsArticleAdapter'
import { filterFlashRssFreshCandidates } from '@/lib/flash/ingestion/flashPublicationFreshness'

// Synthetic reduced structures from the November 2 DOM audit; no copied article text.
const unescoUrl = 'https://www.unesco.org/en/articles/education-update'
const lead = '<div class="field--name-field-description">The actual article summary.</div>'
const tooltip = '<div class="taxonomy-term vocabulary-sdgs-targets"><div class="sdg-tooltip"><div class="field--name-field-description">Unrelated SDG explanation.</div></div></div>'
const header = `<div class="header-node-content">${lead}</div>`
const unesco = (head = header) => `<html lang="en"><main><article class="node--type-article node--view-mode-news"><h1>Education update</h1><div class="created-time">29 October 2026</div>${head}<div class="field--name-field-paragraphs"><p>First source paragraph.</p><p>Second source paragraph.</p></div>${tooltip}</article></main></html>`
const extractUnesco = (html: string) => extractUnescoArticle('https://www.unesco.org/', unescoUrl, html)
const source = { id: 9, nume: 'Anthropic News', url: 'https://www.anthropic.com/', discoveryMethod: 'html',
  discoveryUrl: 'https://www.anthropic.com/news', sourceRole: 'primary', editorialTrust: 'standard',
  citationMode: 'paraphrase', allowAutoPublish: false } as Surse
const plan = assessInstitutionalHtmlSource(source)
const row = (slug = 'science-update', date = 'Oct 28, 2026', prefix = 'NewHash42') => `<li data-listing-row="${slug}" class="${prefix}_row"><div data-expanded="false"><div data-peek="true" class="${prefix}_summary"><a class="${prefix}_title-link" href="/news/${slug}">Science update</a><a href="/news/announcements">Announcements</a><div class="${prefix}_date">${date}</div></div><div class="${prefix}_details"><a href="/news/${slug}">Duplicate title</a><time>Jan 1, 2000</time></div></div></li>`
const listing = (rows: string) => `<html lang="en"><main><div data-listing-rows="true"><ul>${rows}</ul></div></main></html>`
const discover = (html: string) => parseInstitutionalHtmlCandidates(plan, html)
const now = Date.parse('2026-11-02T10:00:00Z')
const articleUrl = 'https://www.anthropic.com/news/science-update'
const anthropicArticle = `<html lang="en"><head><link rel="canonical" href="${articleUrl}"></head><body><main><article class="AnyNewHash_Article"><h1 class="AnotherHash_Title">Science update</h1><ul><li class="AnotherHash_Metadata"><p>Published</p><time datetime="2026-10-28">Oct 28, 2026</time></li><li><p>Updated</p><time>Nov 1, 2026</time></li></ul><div data-article-body="true"><p>The original opening.</p><p>Evidence from the source.</p><aside><p>Related marketing.</p></aside><pre><code>Ignored code.</code></pre></div></article></main></body></html>`
const extractAnthropic = (html: string) => extractAnthropicNewsArticle(source.url, articleUrl, html)

describe('UNESCO article summary scope', () => {
  it('extracts the header summary while excluding an SDG description inside the same article', () => {
    const result = extractUnesco(unesco())
    expect(result).toMatchObject({ lead: 'The actual article summary.', publicationDate: '29 October 2026',
      bodyParagraphs: ['First source paragraph.', 'Second source paragraph.'] })
    expect(result.bodyText).not.toContain('SDG')
  })

  it.each([
    unesco(`<div class="header-node-content"></div>`),
    unesco(`<div class="header-node-content">${lead}${lead}</div>`),
    unesco(header + header),
    unesco(`<div class="header-node-content"><div hidden>${lead}</div></div>`),
    unesco(`<div class="header-node-content"><div class="field--name-field-description"> </div></div>`),
    unesco(''),
    unesco().replace('</main>', '<article class="node--type-article">Other article</article></main>'),
    unesco().replace('class="node--type-article node--view-mode-news"', 'class="unknown-template"'),
  ])('never falls back to an unrelated description when the modern article/header is ambiguous or absent', html => {
    expect(() => extractUnesco(html)).toThrow('FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: description')
  })

  it('continues to reject invalid original dates even with a valid header', () => {
    expect(() => extractUnesco(unesco().replace('29 October 2026', '31 February 2026'))).toThrow('publication date is invalid')
  })
})

describe('Anthropic listing structure independent of compiled module names', () => {
  it.each(['NewHash42', '_Different-Hash_7'])('binds title/date to one peek prefix %s and ignores details, navigation and hidden rows', prefix => {
    const html = listing(row('science-update', 'Oct 28, 2026', prefix) + row('science-update') +
      `<nav>${row('navigation')}</nav><div hidden>${row('hidden')}</div><div aria-hidden="true">${row('aria-hidden')}</div><div inert>${row('inert')}</div>`)
    expect(discover(html)).toHaveLength(1)
    expect(discover(html)[0]).toMatchObject({ concreteUrl: articleUrl, title: 'Science update', publishedAt: '2026-10-28T00:00:00.000Z' })
  })

  it('keeps the existing freshness semantics and does not use dates from collapsed details', () => {
    const result = filterFlashRssFreshCandidates(discover(listing(row('old', 'Aug 1, 2026') + row('missing', '') +
      row('invalid', 'Feb 31, 2026') + row('future', 'Nov 5, 2026'))), { now })
    expect(result.candidates).toEqual([])
    expect(result.rejected).toEqual({ too_old: 1, missing_date: 1, invalid_date: 1, future_date: 1 })
  })

  it.each([
    row().replace('class="NewHash42_title-link"', 'class="Unrelated_title-link"'),
    row().replace('class="NewHash42_summary"', 'class="NewHash42_summary Other_summary"'),
    row().replace('data-peek="true"', 'data-peek="false"'),
    row().replace('</li>', '<div data-peek="true" class="NewHash42_summary">Second summary</div></li>'),
    row().replace('/news/science-update', 'https://evil.example/news/science-update'),
    row().replace('</a><a href="/news/announcements">', '</a><a class="NewHash42_title-link" href="/news/another">Other title</a><a href="/news/announcements">'),
  ])('rejects an ambiguous or structurally unbound row', value => {
    expect(discover(listing(value))).toEqual([])
  })

  it('does not accept a date with an unrelated module prefix', () => {
    const candidates = discover(listing(row().replace('class="NewHash42_date"', 'class="Other_date"')))
    expect(filterFlashRssFreshCandidates(candidates, { now }).rejected.missing_date).toBe(1)
  })

  it('preserves ambiguity when a summary has two original dates', () => {
    const candidates = discover(listing(row().replace('Oct 28, 2026</div>', 'Oct 28, 2026</div><div class="NewHash42_date">Oct 27, 2026</div>')))
    expect(filterFlashRssFreshCandidates(candidates, { now }).rejected.invalid_date).toBe(1)
  })

  it('bounds inspection to 50 raw rows, including malformed rows', () => {
    const invalidRows = Array.from({ length: 50 }, (_, i) => row(`bad-${i}`).replace('data-peek="true"', 'data-peek="false"')).join('')
    expect(discover(listing(invalidRows + row()))).toEqual([])
  })

  it('rejects duplicate listing containers rather than mixing their dates and titles', () => {
    expect(() => discover(listing(row()).replace('</main>', '<div data-listing-rows="true"></div></main>'))).toThrow('listing container')
  })
})

describe('Anthropic article structural provenance', () => {
  it('extracts a renamed template using one article/body and the explicit Published label', () => {
    const result = extractAnthropic(anthropicArticle)
    expect(result).toMatchObject({ publicationDate: 'Oct 28, 2026', title: 'Science update',
      bodyParagraphs: ['The original opening.', 'Evidence from the source.'] })
    expect(result.bodyText).not.toMatch(/marketing|Ignored code/)
  })

  it.each([
    anthropicArticle.replace('datetime="2026-10-28"', 'datetime="2026-10-27"'),
    anthropicArticle.replace('>Published<', '>Updated<'),
    anthropicArticle.replace('Oct 28, 2026', 'Feb 31, 2026'),
    anthropicArticle.replace('</article>', '<h1>Second headline</h1></article>'),
    anthropicArticle.replace('</article>', '<div data-article-body="true"><p>Another body</p></div></article>'),
    anthropicArticle.replace('</ul>', '<li><p>Published</p><time>Oct 27, 2026</time></li></ul>'),
    anthropicArticle.replace('</main>', '<article><h1>Other</h1><div data-article-body="true"><p>Other article</p></div></article></main>'),
    anthropicArticle.replace('data-article-body="true"', 'data-unknown-body="true"'),
    anthropicArticle.replace(articleUrl, 'https://www.anthropic.com/news/another'),
    anthropicArticle.replace(articleUrl, 'https://evil.example/news/science-update'),
    anthropicArticle.replace('lang="en"', 'lang="fr"'),
  ])('rejects ambiguity, changed body markers, original-date and canonical mismatches', html => {
    expect(() => extractAnthropic(html)).toThrow()
  })
})
