export const PUBLIC_LANGUAGES = ['ro', 'en'] as const

export type PublicLanguage = (typeof PUBLIC_LANGUAGES)[number]

export function isPublicLanguage(value: string): value is PublicLanguage {
  return (PUBLIC_LANGUAGES as readonly string[]).includes(value)
}

const PRODUCTION_SITE_URL = 'https://844-ai.ro'

export function isPublicProductionSite(
  siteURL = process.env.SITE_URL,
): boolean {
  if (!siteURL) return false

  return siteURL.trim().replace(/\/+$/, '') === PRODUCTION_SITE_URL
}
