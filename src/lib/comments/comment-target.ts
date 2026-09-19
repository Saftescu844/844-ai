export type CommentRelationshipValue =
  | number
  | string
  | { id?: unknown }
  | null
  | undefined

export type CommentTarget =
  | { kind: 'articol'; id: number | string }
  | { kind: 'flash'; id: number | string }

function hasOwn(
  value: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return Boolean(
    value &&
    Object.prototype.hasOwnProperty.call(value, key),
  )
}

export function commentRelationshipId(
  value: CommentRelationshipValue | unknown,
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
    const id = (value as { id?: unknown }).id

    if (
      typeof id === 'number' ||
      typeof id === 'string'
    ) {
      return id
    }
  }

  return null
}

export function resolveCommentTarget(
  data:
    | Record<string, unknown>
    | null
    | undefined,
  originalDoc?:
    | Record<string, unknown>
    | null,
): CommentTarget | null {
  const articleValue =
    hasOwn(data, 'articol')
      ? data?.articol
      : originalDoc?.articol

  const flashValue =
    hasOwn(data, 'flash')
      ? data?.flash
      : originalDoc?.flash

  const articleId =
    commentRelationshipId(articleValue)

  const flashId =
    commentRelationshipId(flashValue)

  if (
    articleId !== null &&
    flashId === null
  ) {
    return {
      kind: 'articol',
      id: articleId,
    }
  }

  if (
    flashId !== null &&
    articleId === null
  ) {
    return {
      kind: 'flash',
      id: flashId,
    }
  }

  return null
}

export function commentTargetWhere(
  target: CommentTarget,
): Record<string, unknown> {
  return target.kind === 'articol'
    ? {
        articol: {
          equals: target.id,
        },
      }
    : {
        flash: {
          equals: target.id,
        },
      }
}
