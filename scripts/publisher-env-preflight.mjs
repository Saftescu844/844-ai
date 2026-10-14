/**
 * Auto-Publisher GitHub Actions preflight.
 *
 * Runs before npm install and again immediately before the publisher.
 * No database connection, provider request, credential value, or article write.
 * Only names of missing/invalid environment variables are ever reported.
 */

const PROD_PROJECT_REF = 'hyapqvnubhwkwmwudeit'
const PROD_STORAGE_HOST = `${PROD_PROJECT_REF}.supabase.co`
const PROD_BUCKET = 'media'

// The publisher writes article drafts, not media. S3 credentials stay confined
// to the Railway service that actually uploads objects.
const REQUIRED = [
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'ANTHROPIC_API_KEY',
  'MEDIA_PUBLIC_BASE_URL',
]

function parseHttpUrl(value) {
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

function safePath(url) {
  return url.pathname.replace(/\/+$/, '')
}

function checkPublisherEnvironment(env) {
  const errors = []

  if (env.NODE_ENV !== 'production') {
    errors.push('NODE_ENV trebuie să fie production')
  }

  for (const name of REQUIRED) {
    if (typeof env[name] !== 'string' || !env[name].trim()) {
      errors.push(`${name} lipsește sau este goală`)
    }
  }

  if (env.DATABASE_URL?.trim()) {
    try {
      const database = new URL(env.DATABASE_URL)
      const username = decodeURIComponent(database.username)
      const validProtocol = ['postgres:', 'postgresql:'].includes(database.protocol)
      // Only official Supabase direct and pooler endpoints are accepted.
      // The mere presence of the project ID in an unrelated host is unsafe.
      const direct =
        database.hostname === `db.${PROD_STORAGE_HOST}` &&
        username === 'postgres'
      const pooled =
        database.hostname.endsWith('.pooler.supabase.com') &&
        username === `postgres.${PROD_PROJECT_REF}`
      const isProductionDatabase = direct || pooled

      if (!validProtocol || !isProductionDatabase) {
        errors.push('DATABASE_URL nu identifică proiectul Supabase de producție')
      }
    } catch {
      errors.push('DATABASE_URL are un format URI invalid')
    }
  }

  if (env.MEDIA_PUBLIC_BASE_URL?.trim()) {
    const media = parseHttpUrl(env.MEDIA_PUBLIC_BASE_URL.trim())

    if (
      !media ||
      media.hostname !== PROD_STORAGE_HOST ||
      safePath(media) !== `/storage/v1/object/public/${PROD_BUCKET}`
    ) {
      errors.push('MEDIA_PUBLIC_BASE_URL nu indică bucketul public media de producție')
    }
  }

  if (errors.length) {
    for (const message of errors) {
      // GitHub Actions annotations contain no environment values.
      console.error(`::error::PUBLISHER_ENV_PREFLIGHT_FAILED: ${message}`)
    }
    return false
  }

  console.log('PUBLISHER_ENV_PREFLIGHT_OK: production media URL and required provider/DB config verified; values not printed')
  return true
}

if (!checkPublisherEnvironment(process.env)) {
  process.exitCode = 1
}
