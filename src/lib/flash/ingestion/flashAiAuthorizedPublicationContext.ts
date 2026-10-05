export const FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT_KEY =
  'flashAiAuthorizedPublication'

export const FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT = {
  [FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT_KEY]:
    true,
} as const

export function isFlashAiAuthorizedPublicationContext(
  context:
    unknown,
): boolean {
  if (
    !context ||
    typeof context !==
      'object'
  ) {
    return false
  }

  return (
    context as
      Record<
        string,
        unknown
      >
  )[
    FLASH_AI_AUTHORIZED_PUBLICATION_CONTEXT_KEY
  ] === true
}
