import { createHash } from 'node:crypto'

import {
  countFlashEditorialWords,
  parseFlashPrePersistenceEditorialGenerationSemanticOutput,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

import {
  parseFlashPrePersistenceClassificationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceClassificationSemanticOutput'

export const SANDO_APPROVED_SOURCE_ID = 6
export const SANDO_APPROVED_ARTICLE_URL =
  'https://news.mit.edu/2026/planning-system-ensures-robots-flight-path-will-remain-collision-free-1007'
export const SANDO_APPROVED_IEEE_URL =
  'https://ieeexplore.ieee.org/document/11714300'
export const SANDO_APPROVED_SOURCE_FINGERPRINT =
  '3444e426ec578cfbd7d7209a110697bafc385fd1f828d6fb7375a861d84adc34'
export const SANDO_APPROVED_EVENT_FINGERPRINT =
  '8004104addbfb2f40f228b2135e51749c5b6e2438f0cb5a353c942ed4a38d24e'

/** These SHA-256 values pin exactly the two editorially approved files. */
export const SANDO_APPROVED_MANUSCRIPTS = {
  ro: {
    path: 'content/flash-approved/sando-2026-10-11-ro.md',
    sha256: '3ed2cf311c130e6c1ebbe8e2a65495f1c32d98fd7a6a72e89988e320dde414df',
    bodyWords: 618,
    title: 'SANDO: planificare de zbor cu garanții matematice pentru drone în medii necunoscute',
  },
  en: {
    path: 'content/flash-approved/sando-2026-10-11-en.md',
    sha256: 'ce4687b9a19d702bcd0ba97db77eeeded085a6822a5f0283b6c156a572368f50',
    bodyWords: 558,
    title: "SANDO: MIT's Approach to Safer Drone Flights in Unknown, Dynamic Environments",
  },
} as const

export type SandoApprovedLanguage = keyof typeof SANDO_APPROVED_MANUSCRIPTS

export interface SandoApprovedEditorial {
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput
  excerpt: string
  sha256: string
  wordCount: number
}

export const SANDO_APPROVED_CLASSIFICATION =
  parseFlashPrePersistenceClassificationSemanticOutput(
    JSON.stringify({
      pilonId: 1,
      flashType: 'research',
      informationStatus: 'official',
      riskLevel: 'medium',
      isHealthRelated: false,
    }),
  )

/**
 * Human-approved, exact-byte markdown contract. No normalization, model calls,
 * new facts, or silent editorial fixes are permitted. Metadata and source
 * footnotes never enter the article body.
 */
export function parseApprovedSandoEditorial(
  language: SandoApprovedLanguage,
  markdown: string,
): SandoApprovedEditorial {
  const expected = SANDO_APPROVED_MANUSCRIPTS[language]
  const sha256 = createHash('sha256')
    .update(markdown, 'utf8')
    .digest('hex')

  if (sha256 !== expected.sha256) {
    throw new Error('SANDO manuscript differs from the editorially approved SHA-256.')
  }

  if (markdown.includes('\r') || !markdown.endsWith('\n')) {
    throw new Error('SANDO approved manuscript newline contract changed.')
  }

  const sections = markdown.trimEnd().split('\n\n')
  const titleLine = sections[0]
  const excerptLine = sections[1]
  const classificationLine = sections[2]
  const dividerIndex = sections.indexOf('---')

  if (
    titleLine !== `# ${expected.title}` ||
    typeof excerptLine !== 'string' ||
    !excerptLine.startsWith(`**Excerpt (${language.toUpperCase()}):** `) ||
    classificationLine !==
      '**Pilon:** Știri AI / AI News · **Tip:** Cercetare / Research · **Statut:** Propunere pentru revizie, nepublicată' ||
    dividerIndex < 4
  ) {
    throw new Error('SANDO approved manuscript metadata is inconsistent.')
  }

  const excerpt = excerptLine.slice(
    `**Excerpt (${language.toUpperCase()}):** `.length,
  )
  if (
    excerpt.length < 180 ||
    excerpt.length > 300 ||
    excerpt.includes('\n')
  ) {
    throw new Error('SANDO approved excerpt does not meet the 180–300 character contract.')
  }

  const paragraphs = sections.slice(3, dividerIndex)
  if (paragraphs.some(p => p.startsWith('#') || p.includes('\n'))) {
    throw new Error('SANDO body has unexpected markdown or paragraph formatting.')
  }

  const editorial =
    parseFlashPrePersistenceEditorialGenerationSemanticOutput(
      JSON.stringify({
        language,
        editorialTitle: expected.title,
        editorialParagraphs: paragraphs,
      }),
      { targetLanguage: language },
    )
  const wordCount = countFlashEditorialWords(editorial.editorialParagraphs)

  if (wordCount !== expected.bodyWords) {
    throw new Error('SANDO approved body word count changed.')
  }

  const footer = sections.slice(dividerIndex + 1).join('\n\n')
  for (const required of [
    SANDO_APPROVED_ARTICLE_URL,
    SANDO_APPROVED_IEEE_URL,
    'https://arxiv.org/abs/2604.07599',
    '12 zboruri',
  ]) {
    if (!footer.includes(required)) {
      throw new Error('SANDO approved source/editorial note is missing.')
    }
  }

  return { editorial, excerpt, sha256, wordCount }
}
