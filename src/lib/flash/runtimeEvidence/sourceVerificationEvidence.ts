export interface FlashSourceVerificationCandidate {
  id: string

  /**
   * URL-ul de bază din registrul editorial Surse.
   */
  registeredSourceUrl: string

  /**
   * URL-ul concret folosit pentru acest Flash.
   */
  concreteUrl: string

  /**
   * URL-ul final după redirecturi, dacă retrieval-ul
   * a produs unul.
   */
  finalUrl?: string | null

  /**
   * Retrieval-ul tehnic al sursei a reușit.
   */
  retrieved: boolean

  /**
   * Conținutul necesar verificării a fost disponibil.
   * Nu înseamnă că afirmația este adevărată.
   */
  contentAvailable: boolean
}

export type FlashSourceVerificationReason =
  | 'invalid_registered_url'
  | 'invalid_concrete_url'
  | 'invalid_final_url'
  | 'source_identity_mismatch'
  | 'retrieval_failed'
  | 'content_unavailable'

export interface EvaluatedFlashSourceVerification {
  id: string

  registeredUrlValid: boolean
  concreteUrlValid: boolean
  finalUrlValid: boolean

  sourceIdentityMatches: boolean
  retrievalPassed: boolean
  contentAvailable: boolean

  verified: boolean
  reasons: FlashSourceVerificationReason[]
}

export interface FlashSourceVerificationEvidence {
  sourceVerificationPassed: boolean
  evaluatedSources: EvaluatedFlashSourceVerification[]
}

function parseHttpUrl(
  value: string | null | undefined,
): URL | null {
  if (!value) return null

  try {
    const parsed = new URL(value)

    if (
      parsed.protocol !== 'https:' &&
      parsed.protocol !== 'http:'
    ) {
      return null
    }

    return parsed.hostname
      ? parsed
      : null
  } catch {
    return null
  }
}

function normalizedHostname(
  url: URL,
): string {
  const hostname =
    url.hostname
      .toLowerCase()
      .replace(/\.$/, '')

  return hostname.startsWith('www.')
    ? hostname.slice(4)
    : hostname
}

function belongsToRegisteredSource(
  candidateUrl: URL,
  registeredUrl: URL,
): boolean {
  const candidateHost =
    normalizedHostname(candidateUrl)

  const registeredHost =
    normalizedHostname(registeredUrl)

  return (
    candidateHost ===
      registeredHost ||
    candidateHost.endsWith(
      `.${registeredHost}`,
    )
  )
}

export function evaluateFlashSourceVerification(
  sources: FlashSourceVerificationCandidate[],
): FlashSourceVerificationEvidence {
  const evaluatedSources =
    sources.map(
      (
        source,
      ): EvaluatedFlashSourceVerification => {
        const reasons =
          new Set<FlashSourceVerificationReason>()

        const registeredUrl =
          parseHttpUrl(
            source.registeredSourceUrl,
          )

        const concreteUrl =
          parseHttpUrl(
            source.concreteUrl,
          )

        const hasFinalUrl =
          source.finalUrl !== null &&
          source.finalUrl !== undefined

        const finalUrl =
          hasFinalUrl
            ? parseHttpUrl(
                source.finalUrl,
              )
            : null

        const registeredUrlValid =
          registeredUrl !== null

        const concreteUrlValid =
          concreteUrl !== null

        const finalUrlValid =
          !hasFinalUrl ||
          finalUrl !== null

        if (!registeredUrlValid) {
          reasons.add(
            'invalid_registered_url',
          )
        }

        if (!concreteUrlValid) {
          reasons.add(
            'invalid_concrete_url',
          )
        }

        if (!finalUrlValid) {
          reasons.add(
            'invalid_final_url',
          )
        }

        const concreteIdentityMatches =
          registeredUrl !== null &&
          concreteUrl !== null &&
          belongsToRegisteredSource(
            concreteUrl,
            registeredUrl,
          )

        const finalIdentityMatches =
          !hasFinalUrl ||
          (
            registeredUrl !== null &&
            finalUrl !== null &&
            belongsToRegisteredSource(
              finalUrl,
              registeredUrl,
            )
          )

        const sourceIdentityMatches =
          concreteIdentityMatches &&
          finalIdentityMatches

        if (
          registeredUrlValid &&
          concreteUrlValid &&
          finalUrlValid &&
          !sourceIdentityMatches
        ) {
          reasons.add(
            'source_identity_mismatch',
          )
        }

        const retrievalPassed =
          source.retrieved === true

        if (!retrievalPassed) {
          reasons.add(
            'retrieval_failed',
          )
        }

        if (!source.contentAvailable) {
          reasons.add(
            'content_unavailable',
          )
        }

        const verified =
          registeredUrlValid &&
          concreteUrlValid &&
          finalUrlValid &&
          sourceIdentityMatches &&
          retrievalPassed &&
          source.contentAvailable

        return {
          id: source.id,

          registeredUrlValid,
          concreteUrlValid,
          finalUrlValid,

          sourceIdentityMatches,
          retrievalPassed,
          contentAvailable:
            source.contentAvailable,

          verified,
          reasons: [...reasons],
        }
      },
    )

  return {
    /**
     * Un Flash fără nicio sursă concretă nu poate
     * trece source verification.
     */
    sourceVerificationPassed:
      evaluatedSources.length > 0 &&
      evaluatedSources.every(
        source => source.verified,
      ),

    evaluatedSources,
  }
}
