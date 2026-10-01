import {
  buildFlashSourceVerificationDecisionEvidence,
  type FlashSourceVerificationDecisionAdapterResult,
} from './sourceVerificationDecisionAdapter'

import {
  retrieveFlashSource,
  type FlashSourceRetrievalInput,
  type FlashSourceRetrievalResult,
  type FlashSourceRetrieverOptions,
} from './sourceRetriever'

export interface FlashSourceVerificationRuntimePipelineResult
  extends FlashSourceVerificationDecisionAdapterResult {
  retrievals: FlashSourceRetrievalResult[]
}

/**
 * Pipeline read-only:
 *
 * source inputs
 *   -> HTTP retrieval
 *   -> source verification evidence
 *   -> Flash decision evidence
 *
 * Nu face Payload writes și nu publică nimic.
 */
export async function runFlashSourceVerificationRuntimePipeline(
  sources: FlashSourceRetrievalInput[],
  options: FlashSourceRetrieverOptions = {},
): Promise<FlashSourceVerificationRuntimePipelineResult> {
  const retrievals =
    await Promise.all(
      sources.map(
        source =>
          retrieveFlashSource(
            source,
            options,
          ),
      ),
    )

  const verification =
    buildFlashSourceVerificationDecisionEvidence(
      retrievals.map(
        retrieval =>
          retrieval.candidate,
      ),
    )

  return {
    retrievals,
    ...verification,
  }
}
