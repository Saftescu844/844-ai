import { normalizeSearchText } from './normalizeSearchText'

function collectLexicalText(
  value: unknown,
  parts: string[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectLexicalText(item, parts)
    }
    return
  }

  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return
  }

  const record =
    value as Record<string, unknown>

  if (
    typeof record.text === 'string' &&
    record.text.trim()
  ) {
    parts.push(
      record.text.trim(),
    )
  }

  for (
    const [key, nested] of
      Object.entries(record)
  ) {
    if (key === 'text') continue
    collectLexicalText(
      nested,
      parts,
    )
  }
}

export function extractLexicalText(
  value: unknown,
): string {
  const parts: string[] = []

  collectLexicalText(
    value,
    parts,
  )

  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildNormalizedSearchText(
  values: Array<
    string | null | undefined
  >,
): string {
  return normalizeSearchText(
    values
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
            'string' &&
          Boolean(
            value.trim(),
          ),
      )
      .join(' '),
  )
}

export function matchesAllSearchTokens(
  haystack: string,
  tokens: string[],
): boolean {
  return tokens.every(
    token =>
      haystack.includes(
        normalizeSearchText(
          token,
        ),
      ),
  )
}
