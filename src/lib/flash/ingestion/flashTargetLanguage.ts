export type FlashTargetLanguage =
  | 'ro'
  | 'en'

export const DEFAULT_FLASH_TARGET_LANGUAGE:
  FlashTargetLanguage = 'ro'

export function resolveFlashTargetLanguage(
  value:
    FlashTargetLanguage | null | undefined,
): FlashTargetLanguage {
  return value ??
    DEFAULT_FLASH_TARGET_LANGUAGE
}
