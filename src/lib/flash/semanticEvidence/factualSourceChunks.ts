import {
  createHash,
} from 'node:crypto'

import type {
  FlashFactualSourceDocument,
} from './factualSourceCorpus'

import {
  normalizeFlashFactualSourceText,
  type FlashFactualSourceTextNormalizationMethod,
} from './factualSourceTextNormalization'

const DEFAULT_MAX_CHARS =
  1_800

export interface FlashFactualSourceChunk {
  citationId:
    string

  chunkIndex:
    number

  /**
   * Identitate deterministă derivată din:
   * citationId + evidenceText.
   */
  chunkId:
    string

  /**
   * Locator runtime controlat exclusiv de cod.
   *
   * Modelul factual nu îl generează.
   */
  evidenceRef:
    string

  evidenceText:
    string
}

export interface FlashFactualSourceChunkSet {
  citationId:
    string

  normalizationMethod:
    FlashFactualSourceTextNormalizationMethod

  normalizedText:
    string

  chunks:
    FlashFactualSourceChunk[]
}

export interface FlashFactualSourceChunkOptions {
  maxChars?:
    number
}

function cleanMaxChars(
  value:
    number | undefined,
): number {
  if (
    value ===
      undefined
  ) {
    return DEFAULT_MAX_CHARS
  }

  if (
    !Number.isInteger(
      value,
    ) ||
    value < 1
  ) {
    throw new Error(
      'Flash factual source maxChars must be a positive integer',
    )
  }

  return value
}

function normalizeChunkWhitespace(
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

function splitOversizedBlock(
  block:
    string,
  maxChars:
    number,
): string[] {
  const cleaned =
    normalizeChunkWhitespace(
      block,
    )

  if (!cleaned) {
    return []
  }

  if (
    cleaned.length <=
    maxChars
  ) {
    return [
      cleaned,
    ]
  }

  const words =
    cleaned.split(
      ' ',
    )

  const parts:
    string[] =
      []

  let current = ''

  for (
    const word
    of words
  ) {
    /**
     * Un token individual poate depăși limita
     * (URL foarte lung, hash etc.).
     *
     * Nu îl tăiem în v1; păstrăm integritatea
     * textului sursei.
     */
    if (!current) {
      current =
        word

      continue
    }

    const candidate =
      `${current} ${word}`

    if (
      candidate.length <=
      maxChars
    ) {
      current =
        candidate

      continue
    }

    parts.push(
      current,
    )

    current =
      word
  }

  if (current) {
    parts.push(
      current,
    )
  }

  return parts
}

function splitNormalizedText(
  text:
    string,
  maxChars:
    number,
): string[] {
  const blocks =
    text
      .split(
        /\n+/,
      )
      .map(
        block =>
          normalizeChunkWhitespace(
            block,
          ),
      )
      .filter(
        block =>
          block.length > 0,
      )
      .flatMap(
        block =>
          splitOversizedBlock(
            block,
            maxChars,
          ),
      )

  const chunks:
    string[] =
      []

  let current = ''

  for (
    const block
    of blocks
  ) {
    if (!current) {
      current =
        block

      continue
    }

    const candidate =
      `${current}\n${block}`

    if (
      candidate.length <=
      maxChars
    ) {
      current =
        candidate

      continue
    }

    chunks.push(
      current,
    )

    current =
      block
  }

  if (current) {
    chunks.push(
      current,
    )
  }

  return chunks
}

function chunkHash({
  citationId,
  evidenceText,
}: {
  citationId:
    string

  evidenceText:
    string
}): string {
  return createHash(
    'sha256',
  )
    .update(
      citationId,
      'utf8',
    )
    .update(
      '\0',
      'utf8',
    )
    .update(
      evidenceText,
      'utf8',
    )
    .digest(
      'hex',
    )
}

export function buildFlashFactualSourceChunks(
  document:
    FlashFactualSourceDocument,
  options:
    FlashFactualSourceChunkOptions = {},
): FlashFactualSourceChunkSet {
  const maxChars =
    cleanMaxChars(
      options.maxChars,
    )

  const normalized =
    normalizeFlashFactualSourceText({
      contentType:
        document.contentType,

      textContent:
        document.textContent,
    })

  const evidenceTexts =
    splitNormalizedText(
      normalized.text,
      maxChars,
    )

  const chunks =
    evidenceTexts.map(
      (
        evidenceText,
        chunkIndex,
      ): FlashFactualSourceChunk => {
        const hash =
          chunkHash({
            citationId:
              document.citationId,

            evidenceText,
          })

        const hashPrefix =
          hash.slice(
            0,
            16,
          )

        return {
          citationId:
            document.citationId,

          chunkIndex,

          chunkId:
            hash,

          evidenceRef:
            `${document.citationId}:chunk:${chunkIndex}:${hashPrefix}`,

          evidenceText,
        }
      },
    )

  return {
    citationId:
      document.citationId,

    normalizationMethod:
      normalized.method,

    normalizedText:
      normalized.text,

    chunks,
  }
}
