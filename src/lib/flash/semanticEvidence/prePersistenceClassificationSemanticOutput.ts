import {
  FlashSemanticEvidenceProducerError,
} from './semanticEvidenceProducer'

export type FlashPrePersistenceFlashType =
  | 'announcement'
  | 'research'
  | 'regulation'
  | 'product'
  | 'business'
  | 'incident'
  | 'update'
  | 'other'

export type FlashPrePersistenceInformationStatus =
  | 'official'
  | 'confirmed'
  | 'emerging'
  | 'preliminary'
  | 'disputed'
  | 'unverified'

export type FlashPrePersistenceRiskLevel =
  | 'low'
  | 'medium'
  | 'high'

export interface FlashPrePersistenceClassificationSemanticOutput {
  pilonId: number
  flashType: FlashPrePersistenceFlashType
  informationStatus: FlashPrePersistenceInformationStatus
  riskLevel: FlashPrePersistenceRiskLevel
  isHealthRelated: boolean
}

const FLASH_TYPES =
  new Set<FlashPrePersistenceFlashType>([
    'announcement',
    'research',
    'regulation',
    'product',
    'business',
    'incident',
    'update',
    'other',
  ])

const INFORMATION_STATUSES =
  new Set<FlashPrePersistenceInformationStatus>([
    'official',
    'confirmed',
    'emerging',
    'preliminary',
    'disputed',
    'unverified',
  ])

const RISK_LEVELS =
  new Set<FlashPrePersistenceRiskLevel>([
    'low',
    'medium',
    'high',
  ])

type UnknownRecord =
  Record<string, unknown>

function invalidOutput(): never {
  throw new FlashSemanticEvidenceProducerError(
    'invalid_output',
  )
}

function asRecord(
  value: unknown,
): UnknownRecord | null {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as UnknownRecord
}

function hasOnlyKeys(
  record: UnknownRecord,
  allowedKeys: readonly string[],
): boolean {
  const allowed =
    new Set(allowedKeys)

  return Object
    .keys(record)
    .every(
      key => allowed.has(key),
    )
}

/**
 * Strict parser for the bounded REG-001S classification contract.
 *
 * It intentionally does not:
 * - repair JSON;
 * - accept markdown fences;
 * - accept extra fields or free-form rationale;
 * - decide AUTO / REVIEW / BLOCK;
 * - create editorial content;
 * - write to Payload.
 */
export function parseFlashPrePersistenceClassificationSemanticOutput(
  raw: string,
): FlashPrePersistenceClassificationSemanticOutput {
  let parsed: unknown

  try {
    parsed =
      JSON.parse(raw)
  } catch {
    invalidOutput()
  }

  const root =
    asRecord(parsed)

  if (
    !root ||
    !hasOnlyKeys(
      root,
      [
        'pilonId',
        'flashType',
        'informationStatus',
        'riskLevel',
        'isHealthRelated',
      ],
    )
  ) {
    invalidOutput()
  }

  if (
    typeof root.pilonId !== 'number' ||
    !Number.isInteger(root.pilonId) ||
    root.pilonId <= 0
  ) {
    invalidOutput()
  }

  if (
    typeof root.flashType !== 'string' ||
    !FLASH_TYPES.has(
      root.flashType as FlashPrePersistenceFlashType,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof root.informationStatus !== 'string' ||
    !INFORMATION_STATUSES.has(
      root.informationStatus as
        FlashPrePersistenceInformationStatus,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof root.riskLevel !== 'string' ||
    !RISK_LEVELS.has(
      root.riskLevel as FlashPrePersistenceRiskLevel,
    )
  ) {
    invalidOutput()
  }

  if (
    typeof root.isHealthRelated !== 'boolean'
  ) {
    invalidOutput()
  }

  return {
    pilonId:
      root.pilonId,
    flashType:
      root.flashType as FlashPrePersistenceFlashType,
    informationStatus:
      root.informationStatus as
        FlashPrePersistenceInformationStatus,
    riskLevel:
      root.riskLevel as FlashPrePersistenceRiskLevel,
    isHealthRelated:
      root.isHealthRelated,
  }
}
