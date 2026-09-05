import type {
  FlashExtraordinaryClaimEvidenceInput,
  FlashExtraordinaryClaimFindingType,
} from '../runtimeEvidence/extraordinaryClaimEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducer,
} from './semanticEvidenceProducer'

import {
  parseFlashExtraordinaryClaimSemanticOutput,
  toFlashExtraordinaryClaimEvidenceInput,
  type FlashExtraordinaryClaimSemanticOutput,
} from './extraordinaryClaimSemanticOutput'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

interface ExpectedExtraordinaryClaimFinding {
  id:
    string

  type:
    FlashExtraordinaryClaimFindingType
}

const EXPECTED_EXTRAORDINARY_CLAIM_FINDINGS:
  readonly ExpectedExtraordinaryClaimFinding[] = [
    {
      id:
        'extraordinary-breakthrough-cure',

      type:
        'breakthroughOrCureClaim',
    },
    {
      id:
        'extraordinary-near-perfect-performance',

      type:
        'nearPerfectPerformance',
    },
    {
      id:
        'extraordinary-broad-universal-effect',

      type:
        'broadOrUniversalEffect',
    },
    {
      id:
        'extraordinary-replacement-established-practice',

      type:
        'replacementOfEstablishedPractice',
    },
    {
      id:
        'extraordinary-unprecedented-capability',

      type:
        'unprecedentedCapability',
    },
    {
      id:
        'extraordinary-other',

      type:
        'otherExtraordinaryClaim',
    },
  ]

export interface FlashExtraordinaryClaimSemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashExtraordinaryClaimSemanticPrompt {
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
 * Prompt stabil și provider-agnostic.
 *
 * Detectorul clasifică numai existența unor
 * afirmații extraordinare în text.
 *
 * Nu verifică adevărul afirmațiilor și nu decide
 * publicarea.
 */
export function buildFlashExtraordinaryClaimSemanticPrompt(
  document:
    FlashSemanticDocument,
): FlashExtraordinaryClaimSemanticPrompt {
  const systemPrompt = [
    'You are an extraordinary-claim evidence detector for an editorial Flash document.',
    '',
    'Your job is ONLY to identify whether the supplied text contains materially extraordinary claims.',
    'You do NOT decide whether the claim is true.',
    'You do NOT decide whether the document should be published.',
    'You do NOT return AUTO, REVIEW, BLOCK, publication status, risk score, or editorial decision.',
    '',
    'Sensational, enthusiastic, novel, or promotional wording alone does NOT automatically make a claim extraordinary.',
    'Classify the actual meaning of the statement, not isolated keywords.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary.',
    '',
    'You must return exactly one finding for each of the six required categories.',
    '',
    'Allowed verdicts:',
    '- present',
    '- absent',
    '- uncertain',
    '',
    'Extraordinary-claim categories:',
    '- breakthroughOrCureClaim: claims of a cure, definitive breakthrough, complete resolution, or similarly exceptional outcome;',
    '- nearPerfectPerformance: claims of perfect or near-perfect accuracy, success, reliability, effectiveness, or performance;',
    '- broadOrUniversalEffect: claims that an effect works broadly, universally, for everyone, all cases, or essentially without meaningful exceptions;',
    '- replacementOfEstablishedPractice: claims that a new product, method, or technology can replace an established professional, clinical, scientific, or operational practice;',
    '- unprecedentedCapability: claims of capability described as previously impossible, unmatched, unprecedented, or beyond established alternatives;',
    '- otherExtraordinaryClaim: another materially extraordinary claim not covered above.',
    '',
    'evidenceText rules:',
    '- for present or uncertain, use a short exact verbatim substring from the supplied title, excerpt, or bodyText when possible;',
    '- never paraphrase evidenceText;',
    '- never invent evidenceText;',
    '- use null when no exact supporting fragment is available;',
    '- for absent, use null.',
    '',
    'Required findings:',
    '- id=extraordinary-breakthrough-cure, type=breakthroughOrCureClaim',
    '- id=extraordinary-near-perfect-performance, type=nearPerfectPerformance',
    '- id=extraordinary-broad-universal-effect, type=broadOrUniversalEffect',
    '- id=extraordinary-replacement-established-practice, type=replacementOfEstablishedPractice',
    '- id=extraordinary-unprecedented-capability, type=unprecedentedCapability',
    '- id=extraordinary-other, type=otherExtraordinaryClaim',
    '',
    'Exact JSON shape:',
    '{"findings":[{"id":"...","type":"...","verdict":"present|absent|uncertain","evidenceText":"exact substring or null"}]}',
  ].join('\n')

  const userPrompt = [
    'Analyze this Flash document for extraordinary claims.',
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

function validateCompleteExtraordinaryClaimOutput(
  output:
    FlashExtraordinaryClaimSemanticOutput,
): void {
  if (
    output.findings.length !==
    EXPECTED_EXTRAORDINARY_CLAIM_FINDINGS.length
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  const byType =
    new Map(
      output.findings.map(
        finding => [
          finding.type,
          finding,
        ],
      ),
    )

  if (
    byType.size !==
    EXPECTED_EXTRAORDINARY_CLAIM_FINDINGS.length
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  for (
    const expected
    of EXPECTED_EXTRAORDINARY_CLAIM_FINDINGS
  ) {
    const finding =
      byType.get(
        expected.type,
      )

    if (
      !finding ||
      finding.id !==
        expected.id
    ) {
      throw new FlashSemanticEvidenceProducerError(
        'invalid_output',
      )
    }

    if (
      finding.verdict ===
        'absent' &&
      finding.evidenceText !==
        null
    ) {
      throw new FlashSemanticEvidenceProducerError(
        'invalid_output',
      )
    }
  }
}

export function createFlashExtraordinaryClaimSemanticProducer({
  executor,
  provider,
  model,
}: FlashExtraordinaryClaimSemanticProducerOptions):
  FlashSemanticEvidenceProducer<
    FlashExtraordinaryClaimEvidenceInput
  > {
  return {
    descriptor: {
      kind:
        'extraordinaryClaim',

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
        buildFlashExtraordinaryClaimSemanticPrompt(
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
        parseFlashExtraordinaryClaimSemanticOutput(
          raw,
        )

      validateCompleteExtraordinaryClaimOutput(
        output,
      )

      return toFlashExtraordinaryClaimEvidenceInput({
        document,
        output,
      })
    },
  }
}
