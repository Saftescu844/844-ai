export type PublicComment = {
  id: number | string
  continut: string
  createdAt: string
  raspunsLa: number | string | null
  autor: {
    nume: string
  }
}

export function publicRelationshipId(
  value: unknown,
): number | string | null {
  if (
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    'id' in value
  ) {
    const id =
      (value as { id?: unknown }).id

    if (
      typeof id === 'number' ||
      typeof id === 'string'
    ) {
      return id
    }
  }

  return null
}

export function publicAuthorName(
  value: unknown,
): string {
  if (
    value &&
    typeof value === 'object' &&
    'nume' in value
  ) {
    const nume = String(
      (value as { nume?: unknown }).nume ?? '',
    ).trim()

    if (nume) {
      return nume.slice(0, 80)
    }
  }

  return 'Cititor 844-ai'
}

export function serializePublicComment(
  comentariu: {
    id: number | string
    continut: string
    createdAt: string
    raspunsLa?: unknown
    autor?: unknown
  },
): PublicComment {
  return {
    id: comentariu.id,
    continut: comentariu.continut,
    createdAt: comentariu.createdAt,
    raspunsLa:
      publicRelationshipId(
        comentariu.raspunsLa,
      ),
    autor: {
      nume:
        publicAuthorName(
          comentariu.autor,
        ),
    },
  }
}
