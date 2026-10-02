import type {
  Payload,
} from 'payload'

import type {
  FlashAi,
} from '@/payload-types'

import type {
  FlashAiDraftProjection,
} from './articleCandidateFlashAiDraftProjection'

export type FlashAiDraftWriterPayload =
  Pick<
    Payload,
    'create'
  >

export interface CreateFlashAiDraftInput {
  payload:
    FlashAiDraftWriterPayload

  projection:
    FlashAiDraftProjection
}

/**
 * Persists one already-verified FlashAI projection
 * strictly as a Payload draft.
 *
 * No publication, update, job or provider call occurs here.
 */
export async function createFlashAiDraft({
  payload,
  projection,
}: CreateFlashAiDraftInput): Promise<
  FlashAi
> {
  if (
    projection.editorialStatus !== 'draft' ||
    projection.automationDecision !== 'review' ||
    projection._status !== 'draft' ||
    projection.generatAutomat !== true
  ) {
    throw new Error(
      'FlashAI draft writer requires a safe draft projection.',
    )
  }

  return await payload.create({
    collection:
      'flash-ai',

    data:
      projection,

    draft:
      true,

    overrideAccess:
      true,
  })
}
