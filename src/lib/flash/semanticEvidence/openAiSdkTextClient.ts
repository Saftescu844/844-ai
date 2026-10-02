import type OpenAI from 'openai'

import type {
  OpenAiSemanticResponseCreateParams,
  OpenAiSemanticTextClient,
} from './openAiSemanticTextExecutor'

/**
 * Thin SDK adapter:
 *
 * official OpenAI SDK
 *   -> OpenAiSemanticTextClient
 *
 * Keeps SDK-specific types at the system boundary.
 */
export function createOpenAiSdkTextClient(
  client:
    OpenAI,
): OpenAiSemanticTextClient {
  return {
    responses: {
      async create(
        params:
          OpenAiSemanticResponseCreateParams,
      ) {
        const response =
          await client.responses.create({
            model:
              params.model,

            instructions:
              params.instructions,

            input:
              params.input,

            max_output_tokens:
              params.max_output_tokens,

            store:
              params.store,

            ...(params.text
              ? {
                  text:
                    params.text,
                }
              : {}),
          })

        return {
          status:
            response.status,

          output_text:
            response.output_text,

          incomplete_details:
            response.incomplete_details
              ? {
                  reason:
                    response
                      .incomplete_details
                      .reason,
                }
              : null,

          error:
            response.error,
        }
      },
    },
  }
}
