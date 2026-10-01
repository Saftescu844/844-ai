import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  createOpenAiSemanticTextExecutor,
  type OpenAiSemanticTextClient,
} from '@/lib/flash/semanticEvidence/openAiSemanticTextExecutor'

import {
  parseFlashPrePersistenceEditorialGenerationSemanticOutput,
} from '@/lib/flash/semanticEvidence/prePersistenceEditorialGenerationSemanticOutput'

const input = {
  runId:
    'u14-provider-boundary-integrity',
  systemPrompt:
    'system',
  userPrompt:
    'user',
}

function clientReturning(
  outputText: string,
): OpenAiSemanticTextClient {
  return {
    responses: {
      create: async () => ({
        status:
          'completed',
        output_text:
          outputText,
        error:
          null,
      }),
    },
  }
}

function buildEditorialParagraph(): string {
  const phrase =
    'și despre atenție specială Codului de bune practici IA și securitatea acestor clauze simpla existență robots.txt Măsura 3.5 S.U.A.'

  return Array.from(
    {
      length:
        50,
    },
    () =>
      phrase,
  ).join(' ')
}

describe(
  'Flash editorial provider-boundary integrity',
  () => {
    it(
      'preserves internal spaces and Romanian text through the OpenAI executor',
      async () => {
        const raw =
          '  {"value":"și despre atenție specială Codului de bune practici IA și securitatea"}  '

        const executor =
          createOpenAiSemanticTextExecutor({
            client:
              clientReturning(
                raw,
              ),
            model:
              'gpt-test',
          })

        await expect(
          executor(input),
        ).resolves.toBe(
          raw.trim(),
        )
      },
    )

    it(
      'preserves editorial paragraph text exactly from provider boundary through JSON parsing',
      async () => {
        const paragraph =
          buildEditorialParagraph()

        const raw = JSON.stringify({
          language:
            'ro',
          editorialTitle:
            'Integritatea textului editorial',
          editorialParagraphs: [
            paragraph,
          ],
        })

        const executor =
          createOpenAiSemanticTextExecutor({
            client:
              clientReturning(
                `\n${raw}\n`,
              ),
            model:
              'gpt-test',
          })

        const executorOutput =
          await executor(
            input,
          )

        expect(executorOutput)
          .toBe(raw)

        const editorial =
          parseFlashPrePersistenceEditorialGenerationSemanticOutput(
            executorOutput,
          )

        expect(
          editorial
            .editorialParagraphs,
        ).toEqual([
          paragraph,
        ])

        expect(
          editorial
            .editorialParagraphs[0],
        ).toBe(
          paragraph,
        )

        expect(
          editorial
            .editorialParagraphs[0],
        ).toContain(
          'și despre',
        )

        expect(
          editorial
            .editorialParagraphs[0],
        ).toContain(
          'atenție specială',
        )

        expect(
          editorial
            .editorialParagraphs[0],
        ).toContain(
          'Codului de bune practici',
        )
      },
    )
  },
)
