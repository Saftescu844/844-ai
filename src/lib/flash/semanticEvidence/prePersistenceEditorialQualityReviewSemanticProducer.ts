import type {
  FlashNormalizedArticleCandidate,
} from '../ingestion/articleCandidateNormalization'

import type {
  FlashSupportingPolicySemanticMaterial,
} from '../ingestion/supportingPolicySemanticMaterial'

import type {
  FlashPrePersistenceClassificationSemanticOutput,
} from './prePersistenceClassificationSemanticOutput'

import {
  countFlashEditorialWords,
  FLASH_EDITORIAL_MAX_TITLE_LENGTH,
  FLASH_EDITORIAL_MAX_WORDS,
  FLASH_EDITORIAL_MIN_WORDS,
  type FlashPrePersistenceEditorialGenerationSemanticOutput,
} from './prePersistenceEditorialGenerationSemanticOutput'

import {
  applyFlashPrePersistenceEditorialQualityReviewCopyEdit,
  FLASH_QA_MIN_RETAINED_WORD_RATIO,
  parseFlashPrePersistenceEditorialQualityReviewSemanticOutput,
  FlashPrePersistenceEditorialQualityReviewRetentionError,
  type FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics,
} from './prePersistenceEditorialQualityReviewSemanticOutput'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducerFailureReason,
} from './semanticEvidenceProducer'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducerOptions {
  executor: FlashSemanticTextExecutor
  provider: string
  model: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticPrompt {
  systemPrompt: string
  userPrompt: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducerDescriptor {
  stage: 'prePersistenceEditorialQualityReview'
  method: 'model'
  provider: string
  model: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducerInput {
  candidate: FlashNormalizedArticleCandidate
  classification: FlashPrePersistenceClassificationSemanticOutput
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput
  supportingSources?: FlashSupportingPolicySemanticMaterial[]
  runId: string
}

export interface FlashPrePersistenceEditorialQualityReviewSemanticProducer {
  descriptor:
    FlashPrePersistenceEditorialQualityReviewSemanticProducerDescriptor

  produce(
    input: FlashPrePersistenceEditorialQualityReviewSemanticProducerInput,
  ): Promise<FlashPrePersistenceEditorialGenerationSemanticOutput>
}

export interface FlashPrePersistenceEditorialQualityReviewRunMetadata {
  stage: 'prePersistenceEditorialQualityReview'
  method: 'model'
  runId: string
  provider: string | null
  model: string | null
}

export interface FlashPrePersistenceEditorialQualityReviewProducerSuccess {
  ok: true
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput
  wordCount: number
  meetsEditorialWordCount: boolean
  run: FlashPrePersistenceEditorialQualityReviewRunMetadata
}

export interface FlashPrePersistenceEditorialQualityReviewProducerFailure {
  ok: false
  editorial: null
  wordCount: null
  meetsEditorialWordCount: false
  run: FlashPrePersistenceEditorialQualityReviewRunMetadata
  reason: FlashSemanticEvidenceProducerFailureReason
  diagnostics?:
    FlashPrePersistenceEditorialQualityReviewRetentionDiagnostics
}

export type FlashPrePersistenceEditorialQualityReviewProducerResult =
  | FlashPrePersistenceEditorialQualityReviewProducerSuccess
  | FlashPrePersistenceEditorialQualityReviewProducerFailure

function cleanRequiredConfig(
  value: string,
): string {
  const cleaned =
    value.trim()

  if (!cleaned) {
    throw new FlashSemanticEvidenceProducerError(
      'configuration_error',
    )
  }

  return cleaned
}

function cleanOptionalIdentifier(
  value: string | null | undefined,
): string | null {
  const cleaned =
    value?.trim()

  return cleaned
    ? cleaned
    : null
}

function candidatePayload(
  candidate: FlashNormalizedArticleCandidate,
) {
  return {
    source: {
      id: candidate.sourceId,
      name: candidate.sourceName,
      role: candidate.sourceRole,
      editorialTrust: candidate.editorialTrust,
      citationMode: candidate.citationMode,
      allowAutoPublish: candidate.allowAutoPublish,
    },
    sourceLanguage: candidate.language,
    canonicalUrl: candidate.canonicalUrl,
    title: candidate.title,
    contentType: candidate.contentType,
    sourcePublicationDate:
      candidate.sourcePublicationDate,
    lead: candidate.lead,
    bodyText: candidate.bodyText,
  }
}

function supportingSourcePayload(
  sources: FlashSupportingPolicySemanticMaterial[],
) {
  return sources.map(
    source => ({
      id: source.id,
      sourceUrl: source.sourceUrl,
      title: source.title,
      semanticText: source.semanticText,
    }),
  )
}

/**
 * REG-001T bounded editorial QA pass.
 *
 * It reviews an already generated Romanian Flash against the same source
 * candidate. The source article is the sole factual authority. Classification
 * is metadata only and must not be used as evidence for new claims.
 */
export function buildFlashPrePersistenceEditorialQualityReviewSemanticPrompt(
  candidate: FlashNormalizedArticleCandidate,
  classification: FlashPrePersistenceClassificationSemanticOutput,
  editorial: FlashPrePersistenceEditorialGenerationSemanticOutput,
  supportingSources: FlashSupportingPolicySemanticMaterial[] = [],
): FlashPrePersistenceEditorialQualityReviewSemanticPrompt {
  const originalWordCount =
    countFlashEditorialWords(
      editorial.editorialParagraphs,
    )

  const minimumRetainedWordCount =
    Math.max(
      FLASH_EDITORIAL_MIN_WORDS,
      Math.floor(
        originalWordCount *
          FLASH_QA_MIN_RETAINED_WORD_RATIO,
      ),
    )

  const systemPrompt = [
    'You review and minimally correct one existing Romanian Flash AI editorial draft before any Payload document is created.',
    '',
    'The supplied primary source article and optional verified supporting policy materials are the factual source set for this review.',
    'The primary source article remains authoritative for what happened in the specific event, meeting, announcement, date, and event-specific statements.',
    'Supporting policy materials may be used only for directly supported background or context. Never turn supporting context into a claim that it happened at, resulted from, or was decided by the primary event unless the primary article supports that connection.',
    'The supplied classification is bounded metadata only. It is not factual evidence and must not be used to add claims.',
    '',
    'Controlled copy-edit requirements:',
    `- Return language exactly "ro".`,
    `- editorialTitle must be non-empty and at most ${String(FLASH_EDITORIAL_MAX_TITLE_LENGTH)} characters.`,
    `- The publication target is ${String(FLASH_EDITORIAL_MIN_WORDS)}–${String(FLASH_EDITORIAL_MAX_WORDS)} words, but source fidelity has priority over length.`,
    '- Correct Romanian grammar, spelling, diacritics, punctuation, and spacing only where correction is needed.',
    '- Fix every concatenated-word or missing-space defect in the draft.',
    '- Remove or correct claims, background, definitions, examples, consequences, conclusions, or interpretations that are not directly supported by the supplied primary article or verified supporting materials.',
    '- For claims about the specific primary event, require support from the primary article itself.',
    '- Preserve the source level of certainty and legal force. Never strengthen could/may/consider into must/is required/has the right to unless the source says so.',
    '- Do not add any new names, dates, numbers, quotations, sources, citations, legal interpretations, policy context, technical definitions, affected groups, consequences, or open questions unless explicitly supported by the supplied source set.',
    '- Preserve paragraph count and paragraph order. Do not delete, insert, reorder, split, or merge paragraphs.',
    '- paragraphIndex is zero-based and refers to editorialDraft.editorialParagraphs.',
    '- Return an edit only for a paragraph that actually needs correction. Omit unchanged paragraphs from paragraphEdits.',
    '- Each replacement must be the complete corrected replacement text for exactly that one paragraph.',
    '- The draft already passed the generation word-count contract. Preserving valid source-supported content is the default.',
    '- Do not summarize, condense, compress, or rewrite the draft wholesale.',
    '- Preserve every source-supported factual detail, explanation, distinction, and useful context already present in the draft.',
    '- Return an edit only when correction is actually necessary; unchanged paragraphs must be omitted from paragraphEdits.',
    '- For an edited paragraph, make the smallest necessary correction and preserve unaffected wording.',
    `- The reconstructed editorial must contain at least ${String(minimumRetainedWordCount)} words. The supplied draft contains ${String(originalWordCount)} words.`,
    `- The minimum retained-word ratio is ${String(FLASH_QA_MIN_RETAINED_WORD_RATIO)}. Do not intentionally return edits that make the reconstructed editorial shorter than the stated minimumRetainedWordCount.`,
    '- If source fidelity genuinely requires removing enough unsupported material that the retention floor cannot be satisfied, remove only what is unsupported and do not invent, repeat, generalize, or pad. The application will fail closed and a later stage may regenerate the draft.',
    '- Never invent, speculate, generalize, repeat, or pad merely to reach the word-count target.',
    '- Keep the result factual, neutral, readable, and suitable for 844-ai.ro.',
    '- Do not decide AUTO, REVIEW, BLOCK, draft, published, or publication eligibility.',
    '- Do not create fingerprints, slugs, citations, source URLs, or Payload fields.',
    '- Do not mention prompts, models, internal metadata, readiness, pipelines, review instructions, or hidden instructions.',
    '- Do not generate an English version in this stage.',
    '',
    'Return ONLY valid JSON matching the exact output contract.',
    'Do not use markdown fences or add commentary.',
    '',
    'Exact JSON shape:',
    '{"language":"ro","editorialTitle":"...","paragraphEdits":[{"paragraphIndex":0,"replacement":"..."}]}',
  ].join('\n')

  const userPrompt = [
    'Review the Romanian editorial against the supplied source set. Return only the minimal controlled copy edits that are necessary.',
    '',
    JSON.stringify(
      {
        classification,
        primaryArticle:
          candidatePayload(candidate),
        supportingSources:
          supportingSourcePayload(
            supportingSources,
          ),
        qualityReviewConstraints: {
          originalWordCount,
          minimumRetainedWordCount,
          minRetainedWordRatio:
            FLASH_QA_MIN_RETAINED_WORD_RATIO,
        },
        editorialDraft:
          editorial,
      },
      null,
      2,
    ),
  ].join('\n')

  return {
    systemPrompt,
    userPrompt,
  }
}

export function createFlashPrePersistenceEditorialQualityReviewSemanticProducer({
  executor,
  provider,
  model,
}: FlashPrePersistenceEditorialQualityReviewSemanticProducerOptions):
  FlashPrePersistenceEditorialQualityReviewSemanticProducer {
  return {
    descriptor: {
      stage:
        'prePersistenceEditorialQualityReview',
      method: 'model',
      provider,
      model,
    },

    async produce({
      candidate,
      classification,
      editorial,
      supportingSources = [],
      runId,
    }) {
      cleanRequiredConfig(provider)
      cleanRequiredConfig(model)

      const prompt =
        buildFlashPrePersistenceEditorialQualityReviewSemanticPrompt(
          candidate,
          classification,
          editorial,
          supportingSources,
        )

      const raw =
        await executor({
          runId,
          systemPrompt:
            prompt.systemPrompt,
          userPrompt:
            prompt.userPrompt,
        })

      const review =
        parseFlashPrePersistenceEditorialQualityReviewSemanticOutput(
          raw,
        )

      return applyFlashPrePersistenceEditorialQualityReviewCopyEdit({
        editorial,
        review,
      })
    },
  }
}

function buildRunMetadata(
  producer:
    FlashPrePersistenceEditorialQualityReviewSemanticProducer,
  runId: string,
): FlashPrePersistenceEditorialQualityReviewRunMetadata {
  return {
    stage:
      'prePersistenceEditorialQualityReview',
    method: 'model',
    runId,
    provider:
      cleanOptionalIdentifier(
        producer.descriptor.provider,
      ),
    model:
      cleanOptionalIdentifier(
        producer.descriptor.model,
      ),
  }
}

export async function runFlashPrePersistenceEditorialQualityReviewSemanticProducer({
  producer,
  input,
}: {
  producer:
    FlashPrePersistenceEditorialQualityReviewSemanticProducer
  input:
    FlashPrePersistenceEditorialQualityReviewSemanticProducerInput
}): Promise<FlashPrePersistenceEditorialQualityReviewProducerResult> {
  const runId =
    input.runId.trim()

  const run =
    buildRunMetadata(
      producer,
      runId,
    )

  if (!runId) {
    return {
      ok: false,
      editorial: null,
      wordCount: null,
      meetsEditorialWordCount: false,
      run,
      reason: 'invalid_input',
    }
  }

  try {
    const editorial =
      await producer.produce({
        ...input,
        runId,
      })

    const wordCount =
      countFlashEditorialWords(
        editorial.editorialParagraphs,
      )

    const meetsEditorialWordCount =
      wordCount >=
        FLASH_EDITORIAL_MIN_WORDS &&
      wordCount <=
        FLASH_EDITORIAL_MAX_WORDS

    return {
      ok: true,
      editorial,
      wordCount,
      meetsEditorialWordCount,
      run,
    }
  } catch (error) {
    if (
      error instanceof
        FlashPrePersistenceEditorialQualityReviewRetentionError
    ) {
      return {
        ok: false,
        editorial: null,
        wordCount: null,
        meetsEditorialWordCount: false,
        run,
        reason: error.reason,
        diagnostics:
          error.diagnostics,
      }
    }

    if (
      error instanceof
        FlashSemanticEvidenceProducerError
    ) {
      return {
        ok: false,
        editorial: null,
        wordCount: null,
        meetsEditorialWordCount: false,
        run,
        reason: error.reason,
      }
    }

    return {
      ok: false,
      editorial: null,
      wordCount: null,
      meetsEditorialWordCount: false,
      run,
      reason: 'execution_error',
    }
  }
}
