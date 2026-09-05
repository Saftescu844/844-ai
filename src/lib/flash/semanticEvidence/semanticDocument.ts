import type {
  FlashAi,
} from '@/payload-types'

export interface FlashSemanticDocumentMetadata {
  flashType:
    FlashAi['flashType']

  informationStatus:
    FlashAi['informationStatus']

  riskLevel:
    FlashAi['riskLevel']

  isHealthRelated:
    boolean

  medicalEvidenceType:
    NonNullable<
      FlashAi['medicalEvidenceType']
    >

  clinicalValidationStatus:
    NonNullable<
      FlashAi['clinicalValidationStatus']
    >
}

export interface FlashSemanticDocument {
  flashId:
    number

  language:
    FlashAi['limba']

  title:
    string

  excerpt:
    string | null

  /**
   * Reprezentare textuală deterministă a
   * conținutului Lexical.
   *
   * Nu păstrăm obiectul Payload brut și nu
   * depindem de config-ul editorului/serverului.
   */
  bodyText:
    string

  metadata:
    FlashSemanticDocumentMetadata
}

type UnknownRecord =
  Record<string, unknown>

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as UnknownRecord
}

function cleanOptionalText(
  value:
    string | null | undefined,
): string | null {
  const cleaned =
    value?.trim()

  return cleaned
    ? cleaned
    : null
}

/**
 * Extrage textul semantic dintr-un nod Lexical
 * fără să depindă de editorConfig.
 *
 * Nodurile inline sunt concatenate direct.
 * Root separă blocurile.
 * Listele separă itemii pe linii.
 */
function lexicalNodeToText(
  value:
    unknown,
): string {
  const node =
    asRecord(value)

  if (!node) {
    return ''
  }

  if (
    node.type === 'linebreak'
  ) {
    return '\n'
  }

  if (
    typeof node.text ===
    'string'
  ) {
    return node.text
  }

  const children =
    Array.isArray(
      node.children,
    )
      ? node.children
      : []

  if (
    children.length === 0
  ) {
    return ''
  }

  const childTexts =
    children
      .map(
        lexicalNodeToText,
      )
      .filter(
        text =>
          text.length > 0,
      )

  if (
    childTexts.length === 0
  ) {
    return ''
  }

  if (
    node.type === 'root'
  ) {
    return childTexts.join(
      '\n\n',
    )
  }

  if (
    node.type === 'list'
  ) {
    return childTexts.join(
      '\n',
    )
  }

  return childTexts.join('')
}

function normalizeSemanticText(
  value:
    string,
): string {
  return value
    .replace(
      /\r\n?/g,
      '\n',
    )
    .replace(
      /[ \t]+\n/g,
      '\n',
    )
    .replace(
      /\n{3,}/g,
      '\n\n',
    )
    .trim()
}

function lexicalToSemanticText(
  content:
    FlashAi['continut'],
): string {
  return normalizeSemanticText(
    lexicalNodeToText(
      content.root,
    ),
  )
}

/**
 * Transformare pură, provider-agnostică:
 *
 * Payload FlashAi
 *   -> SemanticDocument
 *
 * Nu:
 * - apelează vreun model AI;
 * - face HTTP;
 * - citește/scrie în Payload;
 * - decide AUTO / REVIEW / BLOCK.
 */
export function buildFlashSemanticDocument(
  flash:
    FlashAi,
): FlashSemanticDocument {
  return {
    flashId:
      flash.id,

    language:
      flash.limba,

    title:
      flash.titlu.trim(),

    excerpt:
      cleanOptionalText(
        flash.excerpt,
      ),

    bodyText:
      lexicalToSemanticText(
        flash.continut,
      ),

    metadata: {
      flashType:
        flash.flashType,

      informationStatus:
        flash.informationStatus,

      riskLevel:
        flash.riskLevel,

      isHealthRelated:
        flash.isHealthRelated === true,

      medicalEvidenceType:
        flash.medicalEvidenceType ??
        'notApplicable',

      clinicalValidationStatus:
        flash.clinicalValidationStatus ??
        'notApplicable',
    },
  }
}
