// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { extractFlashHtmlArticle } from '@/lib/flash/ingestion/htmlArticleExtraction'
import { normalizeFlashHtmlArticleCandidate } from '@/lib/flash/ingestion/articleCandidateNormalization'
import { normalizeRomanianEducationPublicationDate, romanianEducationArticleUrl, romanianEducationHasAiRelevance } from '@/lib/flash/ingestion/romanianEducationArticleAdapter'
import { assessFlashRssIngestionSource, parseFlashRssCandidates } from '@/lib/flash/ingestion/rssCandidateIngestion'
import { filterFlashRssFreshCandidates } from '@/lib/flash/ingestion/flashPublicationFreshness'
import { evaluateFlashArticlePersistenceReadiness } from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'
import { buildFlashPrePersistenceEditorialGenerationSemanticPrompt } from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticProducer'
import { isFlashRssArticleUnsupportedLayoutFailure } from '@/lib/flash/ingestion/flashRssStageNextAttemptRunner'

const source = { id: 11, nume: 'Ministerul Educației și Cercetării', url: 'https://www.edu.ro/',
  feedRSS: 'https://www.edu.ro/rss.xml', sourceRole: 'primary' as const,
  editorialTrust: 'standard' as const, citationMode: 'paraphrase' as const, allowAutoPublish: false }
const url = `${source.url}press_rel_23_2025`
// Synthetic text with the structural boundaries observed on old and current releases.
const article = `<html lang="ro"><head><link rel="canonical" href="${url}"></head><body>
<nav><p>Navigație</p></nav><main id="main-content"><div id="block-edu-page-title"><h1>Pilot de inteligență artificială în educație</h1></div>
<article class="edu-article"><div class="edu-article__date"><span>Data publicării</span> <time datetime="2025-03-19">19 martie 2025</time></div>
<div class="edu-article__body"><p>Un pilot AI cu obiective declarate, fără rezultate evaluate încă.</p>
<blockquote><p>Profesorii vor coordona activitățile.</p></blockquote><ul><li>Primul punct.</li><li><p>Al doilea punct.</p></li></ul>
<nav><p>Alte comunicate</p></nav><figure><figcaption>Legendă foto</figcaption></figure>
<p hidden>Text ascuns</p><p aria-hidden="true">Ascuns aria</p><form><p>Abonează-te</p></form>
<p inert>Ascuns inert</p><p>Detaliile vor fi <a href="/context">comunicate ulterior</a>.</p><ul class="links inline"><li>161 views</li></ul></div>
<aside><p>Articole conexe</p></aside><div>Actualizat la 20 octombrie 2026</div></article></main><footer>Subsol</footer></body></html>`
const extract = (html = article) => extractFlashHtmlArticle(source.url, url, html)
const normalize = () => normalizeFlashHtmlArticleCandidate({ ...source, sourceId: source.id,
  sourceName: source.nume, registeredSourceUrl: source.url }, extract())

describe('Romanian Ministry press releases', () => {
  it('scopes the original Romanian body, including quotations, and preserves the original date', () => {
    const result = extract()
    expect(result).toMatchObject({ sourceAdapter: 'ro-education', finalUrl: url, publicationDate: '19 martie 2025', primaryEvidenceUrls: [] })
    expect(result.bodyParagraphs).toEqual(['Un pilot AI cu obiective declarate, fără rezultate evaluate încă.',
      'Profesorii vor coordona activitățile.', 'Primul punct.', 'Al doilea punct.', 'Detaliile vor fi comunicate ulterior.'])
    expect(result.bodyText).not.toMatch(/Navigație|conexe|Actualizat|ascuns|Ascuns|Legendă|Abonează|Subsol|Alte comunicate|views/)
    expect(normalize()).toMatchObject({ language: 'ro', sourcePublicationDate: '2025-03-19', allowAutoPublish: false })
  })
  it('also parses the current date element without requiring an unobserved datetime attribute', () => {
    expect(extract(article.replace('<time datetime="2025-03-19">19 martie 2025</time>', '20 octombrie 2026')))
      .toMatchObject({ publicationDate: '20 octombrie 2026' })
  })
  it.each(['http://www.edu.ro/press_rel_23_2025', 'https://edu.ro.evil.test/press_rel_23_2025',
    'https://sub.edu.ro/press_rel_23_2025', 'https://user@www.edu.ro/press_rel_23_2025',
    'https://www.edu.ro:444/press_rel_23_2025', 'https://www.edu.ro/comunicate',
    'https://www.edu.ro/rss.xml', 'https://www.edu.ro/noutati', 'https://www.edu.ro/press_rel_23_2025/file.pdf',
    'https://www.edu.ro/en/press_rel_23_2025'])('rejects non-release URLs: %s', value => {
    expect(() => romanianEducationArticleUrl(source.url, value)).toThrow()
  })
  it('canonicalizes host aliases and tracking while refusing an untrusted registration', () => {
    expect(romanianEducationArticleUrl(source.url, 'https://edu.ro/press_rel_23_2025/?utm_source=test#body')).toBe(url)
    expect(() => romanianEducationArticleUrl('https://evil.test/', url)).toThrow()
  })
  it.each([
    article.replace('lang="ro"', 'lang="en"'), article.replace('lang="ro"', ''),
    article.replace(`href="${url}"`, 'href="https://www.edu.ro/press_rel_other"'),
    article.replace('<link rel="canonical"', '<link rel="alternate"'),
    article.replace('edu-article__body', 'other-body'), article.replace('Data publicării', 'Data actualizării'),
    article.replace('19 martie 2025', '31 februarie 2025'), article.replace('2025-03-19', '2025-03-20'),
    article.replace('2025-03-19', 'invalid'),
    article.replace('</article>', '<div class="edu-article__date">Data publicării 20 martie 2025</div></article>'),
    article.replace('</article>', '<div class="edu-article__body"><p>Alt corp</p></div></article>'),
  ])('fails closed on missing or conflicting provenance', html => expect(() => extract(html)).toThrow())
  it('requires AI in the title or scoped body, not navigation or general digitalisation', () => {
    const offTopic = article.replace('Pilot de inteligență artificială în educație', 'Manuale în format digital')
      .replace('Un pilot AI cu obiective declarate, fără rezultate evaluate încă.', 'Manuale noi disponibile.')
      .replace('Navigație', 'Inteligență artificială')
    expect(() => extract(offTopic)).toThrow('no explicit AI relevance')
    expect(romanianEducationHasAiRelevance('Digitalizare și burse')).toBe(false)
    expect(romanianEducationHasAiRelevance('Mai multe manuale')).toBe(false)
    expect(romanianEducationHasAiRelevance('INTELIGENȚĂ ARTIFICIALĂ')).toBe(true)
    expect(romanianEducationHasAiRelevance('inteligenta artificiala')).toBe(true)
    expect(romanianEducationHasAiRelevance('Utilizarea inteligenței artificiale')).toBe(true)
  })
  it.each(['31 februarie 2026', '29 februarie 2025', '0 martie 2026', '32 martie 2026',
    '19 unknown 2026', '2026-10-20', '', '20 October 2026'])('rejects invalid or unobserved dates: %s', value => {
    expect(() => normalizeRomanianEducationPublicationDate(value)).toThrow()
  })
  it('supports leap dates and all Romanian months', () => {
    expect(normalizeRomanianEducationPublicationDate('29 februarie 2024')).toBe('2024-02-29')
    for (const [index, month] of ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie',
      'august','septembrie','octombrie','noiembrie','decembrie'].entries()) {
      expect(normalizeRomanianEducationPublicationDate(`1 ${month} 2026`)).toBe(`2026-${String(index + 1).padStart(2, '0')}-01`)
    }
  })
  it('filters the general feed before attempts and leaves old AI releases to the existing freshness gate', async () => {
    const items = [
      { title: 'Rezultatele concursului de directori', link: `${source.url}press_rel_77_26` },
      { title: 'Pilot de inteligență artificială', link: url, pubDate: 'Wed, 19 Mar 2025 12:00:00 GMT' },
      { title: 'Inteligență artificială', link: 'https://other.test/press_rel_12' },
      { title: 'Inteligență artificială', link: `${source.url}comunicate` },
      { title: 'Formare pentru profesori', contentSnippet: 'Un curs despre învățare automată.', link: `${source.url}press_rel_80_26`, pubDate: 'Tue, 20 Oct 2026 12:00:00 GMT' },
    ]
    const parsed = await parseFlashRssCandidates(assessFlashRssIngestionSource(source), '',
      { scanBeforeEligibility: true, maxItems: 50, parseFeed: async () => ({ items }) })
    expect(parsed).toMatchObject({ totalItems: 5, skippedItems: 3 })
    expect(parsed.candidates.map(c => c.concreteUrl)).toEqual([url, `${source.url}press_rel_80_26`])
    const fresh = filterFlashRssFreshCandidates(parsed.candidates, { now: Date.parse('2026-10-28T11:00:00Z'), maxAgeDays: 30 })
    expect(fresh.candidates.map(c => c.concreteUrl)).toEqual([`${source.url}press_rel_80_26`])
  })
  it.each(['ro', 'en'] as const)('keeps source Romanian when the editorial target is %s', targetLanguage => {
    const candidate = normalize()
    const readiness = evaluateFlashArticlePersistenceReadiness({ candidate, targetLanguage,
      sourceFingerprint: 'source-fingerprint', sourceVerification: { sourceVerificationPassed: true, evaluatedSources: [] },
      dedup: { candidateCanonicalUrl: candidate.canonicalUrl, sourceDuplicateFound: false,
        eventFingerprintDuplicateFound: false, sourceFingerprintReviewSignal: false, titleReviewSignal: false,
        finalDedupPending: true, reasons: ['missing_event_fingerprint'], matches: [] } })
    expect(readiness.sourceGroundedValues.language).toBe('ro')
    expect(readiness.targetLanguage).toBe(targetLanguage)
    expect(readiness.canCreateFlashAiDraft).toBe(false)
    const prompt = buildFlashPrePersistenceEditorialGenerationSemanticPrompt(candidate,
      { pilonId: 3, flashType: 'product', informationStatus: 'official', riskLevel: 'low', isHealthRelated: false }, [], targetLanguage)
    expect(prompt.userPrompt).toContain('"sourceLanguage": "ro"')
    expect(prompt.userPrompt).toContain(`"targetLanguage": "${targetLanguage}"`)
  })
  it('only treats bounded structural errors as layout skips', () => {
    expect(isFlashRssArticleUnsupportedLayoutFailure('FLASH_RO_EDUCATION_ARTICLE_LAYOUT_UNSUPPORTED: article body')).toBe(true)
    expect(isFlashRssArticleUnsupportedLayoutFailure('FLASH_RO_EDUCATION_ARTICLE_LAYOUT_UNSUPPORTED: arbitrary text')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('Romanian Education canonical URL does not match the retrieved article.')).toBe(false)
    expect(isFlashRssArticleUnsupportedLayoutFailure('Romanian Education original publication date is invalid or missing.')).toBe(false)
  })
})
