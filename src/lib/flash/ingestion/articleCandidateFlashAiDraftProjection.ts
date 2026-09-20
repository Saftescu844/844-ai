import type {
  FlashAi,
} from '@/payload-types'

import type {
  FlashArticlePersistenceReadiness,
} from './articleCandidatePersistenceReadiness'
import type {
  FlashTargetLanguage,
} from './flashTargetLanguage'

export interface FlashAiDraftProjection {
  titlu: string
  limba: FlashTargetLanguage
  pilon: number
  flashType: FlashAi['flashType']
  continut: FlashAi['continut']

  surseFlash: NonNullable<
    FlashAi['surseFlash']
  >

  informationStatus:
    FlashAi['informationStatus']
  riskLevel:
    FlashAi['riskLevel']
  isHealthRelated: boolean

  editorialStatus: 'draft'
  automationDecision: 'review'

  sourceFingerprint: string
  eventFingerprint: string | null

  generatAutomat: true
  _status: 'draft'
}

/**
 * Pure projection only.
 *
 * This helper does not call Payload and does not write
 * anything to the database.
 */
export function projectFlashAiDraftFromPersistenceReadiness(
  readiness:
    FlashArticlePersistenceReadiness,
): FlashAiDraftProjection {
  if (
    !readiness.canCreateFlashAiDraft ||
    readiness.blockers.length > 0
  ) {
    throw new Error(
      'FlashAI draft projection requires eligible persistence readiness.',
    )
  }

  if (!readiness.verifiedEditorial) {
    throw new Error(
      'FlashAI draft projection requires verified editorial content.',
    )
  }

  if (!readiness.classification) {
    throw new Error(
      'FlashAI draft projection requires validated classification.',
    )
  }

  const {
    verifiedEditorial,
    classification,
    sourceGroundedValues,
    draftControls,
  } = readiness

  if (
    draftControls.editorialStatus !== 'draft' ||
    draftControls.automationDecision !==
      'review' ||
    draftControls.payloadStatus !== 'draft'
  ) {
    throw new Error(
      'FlashAI draft projection requires safe draft controls.',
    )
  }

  return {
    titlu:
      verifiedEditorial.editorialTitle,

    limba:
      readiness.targetLanguage,

    pilon:
      classification.pilonId,

    flashType:
      classification.flashType,

    continut:
      verifiedEditorial.lexicalContent,

    surseFlash: [
      {
        sursa:
          sourceGroundedValues.sourceId,
        url:
          sourceGroundedValues.canonicalUrl,
        sourcePublishedAt:
          sourceGroundedValues
            .sourcePublishedAt,
        primary: true,
      },
    ],

    informationStatus:
      classification.informationStatus,

    riskLevel:
      classification.riskLevel,

    isHealthRelated:
      classification.isHealthRelated,

    editorialStatus:
      draftControls.editorialStatus,

    automationDecision:
      draftControls.automationDecision,

    sourceFingerprint:
      sourceGroundedValues
        .sourceFingerprint,

    eventFingerprint:
      sourceGroundedValues
        .eventFingerprint,

    generatAutomat: true,

    _status:
      draftControls.payloadStatus,
  }
}
