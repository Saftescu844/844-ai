export interface FlashSemanticTextExecutorInput {
  runId:
    string

  systemPrompt:
    string

  userPrompt:
    string
}

/**
 * Contract minim provider-agnostic pentru un model
 * care întoarce text.
 *
 * Anthropic/OpenAI/etc. vor putea implementa ulterior
 * această interfață fără să intre în Decision Engine.
 */
export type FlashSemanticTextExecutor =
  (
    input:
      FlashSemanticTextExecutorInput,
  ) => Promise<string>
