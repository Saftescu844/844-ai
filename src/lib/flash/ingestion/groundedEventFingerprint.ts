import {
  createHash,
} from 'node:crypto'

const EVENT_FINGERPRINT_NAMESPACE =
  'flash-event:v1'

export interface FlashGroundedEventIdentity {
  /**
   * Namespace / authority pentru identificatorul stabil,
   * de exemplu: eur-lex, doi, cve.
   */
  authority: string

  /**
   * Identificator extern stabil și deja canonicalizat
   * de producătorul lui.
   *
   * Nu folosim aici titlu, dată editorială sau URL.
   */
  stableId: string
}

export interface FlashGroundedEventFingerprint {
  eventFingerprint: string
  eventFingerprintStatus: 'grounded'
  identity: FlashGroundedEventIdentity
}

function normalizeAuthority(
  value: string,
): string {
  const normalized =
    value
      .trim()
      .toLowerCase()

  if (!normalized) {
    throw new Error(
      'Flash event fingerprint requires a grounded identity authority.',
    )
  }

  return normalized
}

function normalizeStableId(
  value: string,
): string {
  const normalized =
    value.trim()

  if (!normalized) {
    throw new Error(
      'Flash event fingerprint requires a grounded stable identifier.',
    )
  }

  try {
    const url =
      new URL(
        normalized,
      )

    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    ) {
      throw new Error(
        'Flash event fingerprint stable identifier must not be a source URL.',
      )
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'Flash event fingerprint stable identifier must not be a source URL.'
    ) {
      throw error
    }
  }

  return normalized
}

/**
 * Construiește un eventFingerprint numai dintr-o identitate
 * externă stabilă și explicită.
 *
 * Deliberat NU derivă identitatea evenimentului din:
 * - titlu;
 * - data publicării;
 * - URL-ul sursei;
 * - similaritate fuzzy / embeddings / model output nevalidat.
 *
 * Dacă nu există un astfel de identificator stabil,
 * eventFingerprint trebuie să rămână pending în etapa caller-ului.
 */
export function buildFlashGroundedEventFingerprint(
  identity:
    FlashGroundedEventIdentity,
): FlashGroundedEventFingerprint {
  const authority =
    normalizeAuthority(
      identity.authority,
    )

  const stableId =
    normalizeStableId(
      identity.stableId,
    )

  const eventFingerprint =
    createHash(
      'sha256',
    )
      .update(
        `${EVENT_FINGERPRINT_NAMESPACE}|${authority}|${stableId}`,
        'utf8',
      )
      .digest(
        'hex',
      )

  return {
    eventFingerprint,
    eventFingerprintStatus:
      'grounded',
    identity: {
      authority,
      stableId,
    },
  }
}
