import {
  JSDOM,
} from 'jsdom'

export type FlashFactualSourceTextNormalizationMethod =
  | 'html_dom'
  | 'xml_dom'
  | 'plain_text'

export interface FlashFactualSourceTextNormalizationInput {
  contentType:
    string | null

  textContent:
    string
}

export interface FlashFactualSourceTextNormalizationResult {
  method:
    FlashFactualSourceTextNormalizationMethod

  text:
    string
}

function normalizedContentType(
  value:
    string | null,
): string {
  return (
    value
      ?.split(
        ';',
        1,
      )[0]
      ?.trim()
      .toLowerCase() ??
    ''
  )
}

function normalizeWhitespace(
  value:
    string,
): string {
  return value
    .replace(
      /\r\n?/g,
      '\n',
    )
    .replace(
      /[\t\f\v ]+/g,
      ' ',
    )
    .replace(
      / *\n */g,
      '\n',
    )
    .replace(
      /\n{3,}/g,
      '\n\n',
    )
    .trim()
}

function normalizeInlineWhitespace(
  value:
    string,
): string {
  return value
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}

const HTML_TEXT_BLOCK_SELECTOR =
  [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'li',
    'blockquote',
    'pre',
    'figcaption',
    'dt',
    'dd',
    'td',
    'th',
  ].join(',')

function removeIgnoredDomElements(
  root:
    Element | Document,
): void {
  root
    .querySelectorAll(
      [
        'script',
        'style',
        'noscript',
        'template',
        'svg',
      ].join(','),
    )
    .forEach(
      element =>
        element.remove(),
    )
}

function normalizeHtmlDomText(
  root:
    Element | null,
): string {
  if (!root) {
    return ''
  }

  removeIgnoredDomElements(
    root,
  )

  const blocks = [
    ...root.querySelectorAll(
      HTML_TEXT_BLOCK_SELECTOR,
    ),
  ]
    /**
     * Dacă un block conține alt block textual,
     * păstrăm doar nivelul cel mai interior pentru
     * a evita duplicarea textului.
     */
    .filter(
      block =>
        block.querySelector(
          HTML_TEXT_BLOCK_SELECTOR,
        ) ===
        null,
    )
    .map(
      block =>
        normalizeInlineWhitespace(
          block.textContent ??
            '',
        ),
    )
    .filter(
      text =>
        text.length > 0,
    )

  if (
    blocks.length >
    0
  ) {
    return blocks.join(
      '\n',
    )
  }

  return normalizeInlineWhitespace(
    root.textContent ??
      '',
  )
}

function normalizeXmlDomText(
  root:
    Document,
): string {
  removeIgnoredDomElements(
    root,
  )

  return normalizeWhitespace(
    root.documentElement
      ?.textContent ??
      '',
  )
}

function normalizeHtml(
  textContent:
    string,
): string {
  const dom =
    new JSDOM(
      textContent,
    )

  const document =
    dom.window.document

  const root =
    document.querySelector(
      'main',
    ) ??
    document.querySelector(
      'article',
    ) ??
    document.body

  return normalizeHtmlDomText(
    root,
  )
}

function normalizeXml(
  textContent:
    string,
): string {
  const dom =
    new JSDOM(
      textContent.trim(),
      {
        contentType:
          'text/xml',
      },
    )

  return normalizeXmlDomText(
    dom.window.document,
  )
}

function isHtmlContentType(
  contentType:
    string,
): boolean {
  return (
    contentType ===
      'text/html' ||
    contentType ===
      'application/xhtml+xml'
  )
}

function isXmlContentType(
  contentType:
    string,
): boolean {
  return (
    contentType ===
      'application/xml' ||
    contentType ===
      'text/xml' ||
    contentType ===
      'application/rss+xml' ||
    contentType ===
      'application/atom+xml'
  )
}

/**
 * Normalizare deterministă pentru conținutul deja
 * recuperat de Source Verification.
 *
 * Nu:
 * - face HTTP;
 * - apelează modele;
 * - scrie în Payload;
 * - produce chunks sau evidenceRef.
 */
export function normalizeFlashFactualSourceText(
  input:
    FlashFactualSourceTextNormalizationInput,
): FlashFactualSourceTextNormalizationResult {
  const contentType =
    normalizedContentType(
      input.contentType,
    )

  if (
    isHtmlContentType(
      contentType,
    )
  ) {
    return {
      method:
        'html_dom',

      text:
        normalizeHtml(
          input.textContent,
        ),
    }
  }

  if (
    isXmlContentType(
      contentType,
    )
  ) {
    try {
      return {
        method:
          'xml_dom',

        text:
          normalizeXml(
            input.textContent,
          ),
      }
    } catch {
      /**
       * XML malformat nu trebuie să dispară.
       * Rămâne disponibil conservator ca text brut
       * normalizat.
       */
      return {
        method:
          'plain_text',

        text:
          normalizeWhitespace(
            input.textContent,
          ),
      }
    }
  }

  return {
    method:
      'plain_text',

    text:
      normalizeWhitespace(
        input.textContent,
      ),
  }
}
