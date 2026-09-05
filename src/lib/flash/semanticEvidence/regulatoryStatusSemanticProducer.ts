import type {
  FlashRegulatoryStatusEvidenceInput,
} from '../runtimeEvidence/regulatoryStatusEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducer,
} from './semanticEvidenceProducer'

import {
  parseFlashRegulatoryStatusSemanticOutput,
  toFlashRegulatoryStatusEvidenceInput,
  type FlashRegulatoryStatusSemanticOutput,
} from './regulatoryStatusSemanticOutput'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

export interface FlashRegulatoryStatusSemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashRegulatoryStatusSemanticPrompt {
  systemPrompt:
    string

  userPrompt:
    string
}

function cleanRequiredConfig(
  value:
    string,
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

function documentPayload(
  document:
    FlashSemanticDocument,
) {
  return {
    language:
      document.language,

    title:
      document.title,

    excerpt:
      document.excerpt,

    bodyText:
      document.bodyText,

    metadata: {
      flashType:
        document.metadata
          .flashType,

      informationStatus:
        document.metadata
          .informationStatus,

      riskLevel:
        document.metadata
          .riskLevel,

      isHealthRelated:
        document.metadata
          .isHealthRelated,

      medicalEvidenceType:
        document.metadata
          .medicalEvidenceType,

      clinicalValidationStatus:
        document.metadata
          .clinicalValidationStatus,
    },
  }
}

/**
 * Prompt stabil și provider-agnostic pentru
 * status regulator.
 *
 * Detectorul descrie numai contextul și afirmațiile
 * regulatorii prezente în document.
 *
 * Nu stabilește juridic validitatea lor și nu decide
 * publicarea.
 */
export function buildFlashRegulatoryStatusSemanticPrompt(
  document:
    FlashSemanticDocument,
): FlashRegulatoryStatusSemanticPrompt {
  const systemPrompt = [
    'You are a regulatory-status evidence detector for an editorial Flash document.',
    '',
    'Your job is ONLY to identify whether regulatory status is materially relevant to the claims in the supplied document and, when relevant, to classify concrete regulatory-status statements.',
    '',
    'You do NOT make a legal determination.',
    'You do NOT independently verify a regulator, authorization, approval, jurisdiction, indication, market status, or regulatory transition.',
    'You do NOT decide whether the document should be published.',
    'You do NOT return AUTO, REVIEW, BLOCK, publication status, risk score, or editorial decision.',
    '',
    'Do NOT infer regulatory relevance merely because:',
    '- the document is medical or clinical;',
    '- a product or company is mentioned;',
    '- a regulator name such as FDA or EMA appears incidentally;',
    '- words such as approved, authorized, certified, regulated, clinical, or medical appear without a materially relevant regulatory-status claim.',
    '',
    'Set regulatoryContextRelevant=true only when regulatory status materially affects or qualifies a claim in the document.',
    '',
    'Allowed finding types:',
    '- approvalOrAuthorization',
    '- jurisdictionApplicability',
    '- approvedIndicationOrUse',
    '- researchUseOnly',
    '- marketAvailability',
    '- regulatoryChangeOrTransition',
    '- otherRegulatoryStatus',
    '',
    'Allowed verdicts:',
    '- clear: the document states a concrete regulatory status clearly;',
    '- unclear: the document makes regulatory status relevant but leaves an important aspect unclear;',
    '- conflicting: the document contains materially conflicting regulatory-status statements.',
    '',
    'There is NO requirement to return one finding for every type.',
    'Return zero, one, or multiple findings according to the document.',
    'Multiple findings of the same type are allowed when they refer to distinct regulatory statements.',
    '',
    'If regulatoryContextRelevant=false, findings MUST be an empty array.',
    'If regulatoryContextRelevant=true but the document does not provide enough concrete status information, findings may be an empty array.',
    '',
    'evidenceText rules:',
    '- use a short exact verbatim substring from title, excerpt, or bodyText when available;',
    '- never paraphrase evidenceText;',
    '- never invent evidenceText;',
    '- use null when no exact textual fragment supports the finding.',
    '',
    'Finding ids must be non-empty and unique within this response.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary.',
    '',
    'Exact JSON shape:',
    '{"regulatoryContextRelevant":true|false,"findings":[{"id":"...","type":"...","verdict":"clear|unclear|conflicting","evidenceText":"exact substring or null"}]}',
  ].join('\n')

  const userPrompt = [
    'Analyze this Flash document for regulatory-status evidence.',
    '',
    JSON.stringify(
      documentPayload(
        document,
      ),
      null,
      2,
    ),
  ].join('\n')

  return {
    systemPrompt,
    userPrompt,
  }
}

function validateRegulatoryStatusOutput(
  output:
    FlashRegulatoryStatusSemanticOutput,
): void {
  /**
   * Dacă detectorul spune explicit că statusul
   * regulator nu este relevant, nu trebuie să
   * producă simultan findings regulatorii.
   */
  if (
    !output.regulatoryContextRelevant &&
    output.findings.length > 0
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }
}

export function createFlashRegulatoryStatusSemanticProducer({
  executor,
  provider,
  model,
}: FlashRegulatoryStatusSemanticProducerOptions):
  FlashSemanticEvidenceProducer<
    FlashRegulatoryStatusEvidenceInput
  > {
  return {
    descriptor: {
      kind:
        'regulatoryStatus',

      method:
        'model',

      provider,

      model,
    },

    async produce({
      document,
      runId,
    }) {
      cleanRequiredConfig(
        provider,
      )

      cleanRequiredConfig(
        model,
      )

      const prompt =
        buildFlashRegulatoryStatusSemanticPrompt(
          document,
        )

      const raw =
        await executor({
          runId,

          systemPrompt:
            prompt.systemPrompt,

          userPrompt:
            prompt.userPrompt,
        })

      const output =
        parseFlashRegulatoryStatusSemanticOutput(
          raw,
        )

      validateRegulatoryStatusOutput(
        output,
      )

      return toFlashRegulatoryStatusEvidenceInput({
        document,
        output,
      })
    },
  }
}
