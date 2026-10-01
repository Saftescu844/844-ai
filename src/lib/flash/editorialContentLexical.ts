import type {
  FlashAi,
} from '@/payload-types'

type UnknownRecord =
  Record<string, unknown>

export type FlashEditorialContentIntegrityReason =
  | 'invalid_lexical_shape'
  | 'round_trip_mismatch'

export class FlashEditorialContentIntegrityError
  extends Error {
  readonly reason:
    FlashEditorialContentIntegrityReason

  constructor(
    reason:
      FlashEditorialContentIntegrityReason,
  ) {
    super(reason)

    this.name =
      'FlashEditorialContentIntegrityError'

    this.reason =
      reason
  }
}

function fail(
  reason:
    FlashEditorialContentIntegrityReason,
): never {
  throw new FlashEditorialContentIntegrityError(
    reason,
  )
}

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

/**
 * Deterministic bridge from canonical editorial paragraphs
 * to the minimal Payload Lexical structure used by FlashAI.
 *
 * It intentionally performs no trimming, whitespace repair,
 * normalization, or linguistic transformation.
 */
export function buildFlashEditorialLexicalContent(
  paragraphs:
    readonly string[],
): FlashAi['continut'] {
  return {
    root: {
      type:
        'root',

      children:
        paragraphs.map(
          text => ({
            type:
              'paragraph',

            children: [
              {
                type:
                  'text',

                text,

                detail:
                  0,

                format:
                  0,

                mode:
                  'normal',

                style:
                  '',

                version:
                  1,
              },
            ],

            direction:
              null,

            format:
              '',

            indent:
              0,

            textFormat:
              0,

            textStyle:
              '',

            version:
              1,
          }),
        ),

      direction:
        null,

      format:
        '',

      indent:
        0,

      version:
        1,
    },
  } as FlashAi['continut']
}

/**
 * Narrow extractor for the exact paragraph/text-node shape
 * produced by buildFlashEditorialLexicalContent.
 *
 * It is deliberately independent from semanticDocument.ts so
 * the round-trip check cannot mask a shared normalization bug.
 */
export function extractFlashEditorialParagraphs(
  content:
    unknown,
): string[] {
  const contentRecord =
    asRecord(content)

  const root =
    asRecord(
      contentRecord?.root,
    )

  if (
    !root ||
    root.type !== 'root' ||
    !Array.isArray(
      root.children,
    )
  ) {
    fail(
      'invalid_lexical_shape',
    )
  }

  return root.children.map(
    value => {
      const paragraph =
        asRecord(value)

      if (
        !paragraph ||
        paragraph.type !==
          'paragraph' ||
        !Array.isArray(
          paragraph.children,
        ) ||
        paragraph.children.length !==
          1
      ) {
        fail(
          'invalid_lexical_shape',
        )
      }

      const textNode =
        asRecord(
          paragraph.children[0],
        )

      if (
        !textNode ||
        textNode.type !== 'text' ||
        typeof textNode.text !==
          'string'
      ) {
        fail(
          'invalid_lexical_shape',
        )
      }

      return textNode.text
    },
  )
}

export function buildVerifiedFlashEditorialLexicalContent(
  paragraphs:
    readonly string[],
): FlashAi['continut'] {
  const content =
    buildFlashEditorialLexicalContent(
      paragraphs,
    )

  const roundTrip =
    extractFlashEditorialParagraphs(
      content,
    )

  if (
    roundTrip.length !==
      paragraphs.length ||
    roundTrip.some(
      (
        paragraph,
        index,
      ) =>
        paragraph !==
        paragraphs[index],
    )
  ) {
    fail(
      'round_trip_mismatch',
    )
  }

  return content
}
