import type {
  FlashSafetyEvidenceInput,
  FlashSafetyFindingType,
} from '../runtimeEvidence/safetyEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducer,
} from './semanticEvidenceProducer'

import {
  parseFlashSafetySemanticOutput,
  toFlashSafetyEvidenceInput,
  type FlashSafetySemanticOutput,
} from './safetySemanticOutput'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

interface ExpectedSafetyFinding {
  id:
    string

  type:
    FlashSafetyFindingType
}

const EXPECTED_SAFETY_FINDINGS:
  readonly ExpectedSafetyFinding[] = [
    {
      id:
        'safety-general',
      type:
        'generalSafetyConcern',
    },
    {
      id:
        'safety-individual-diagnosis',
      type:
        'individualDiagnosis',
    },
    {
      id:
        'safety-individual-treatment',
      type:
        'individualTreatmentRecommendation',
    },
    {
      id:
        'safety-medication-change',
      type:
        'medicationChange',
    },
    {
      id:
        'safety-dangerous-instructions',
      type:
        'dangerousInstructions',
    },
    {
      id:
        'safety-editorial-violation',
      type:
        'fundamentalEditorialViolation',
    },
  ]

export interface FlashSafetySemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashSafetySemanticPrompt {
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
 * Modelul produce doar findings.
 * Nu decide publicarea.
 */
export function buildFlashSafetySemanticPrompt(
  document:
    FlashSemanticDocument,
): FlashSafetySemanticPrompt {
  const systemPrompt = [
    'You are a safety evidence detector for an editorial Flash document.',
    '',
    'Your job is ONLY to classify safety findings in the supplied document.',
    'You do NOT decide whether the document should be published.',
    'You do NOT return AUTO, REVIEW, BLOCK, publication status, risk score, or editorial decision.',
    '',
    'Return ONLY valid JSON.',
    'Do not use markdown fences.',
    'Do not add commentary.',
    '',
    'You must return exactly one finding for each of the six required safety categories.',
    '',
    'Allowed verdicts:',
    '- present',
    '- absent',
    '- uncertain',
    '',
    'evidenceText rules:',
    '- for present or uncertain, use a short exact verbatim substring from the supplied title, excerpt, or bodyText when possible;',
    '- never paraphrase evidenceText;',
    '- never invent evidenceText;',
    '- use null when no exact supporting fragment is available;',
    '- for absent, use null.',
    '',
    'Required findings:',
    '- id=safety-general, type=generalSafetyConcern',
    '- id=safety-individual-diagnosis, type=individualDiagnosis',
    '- id=safety-individual-treatment, type=individualTreatmentRecommendation',
    '- id=safety-medication-change, type=medicationChange',
    '- id=safety-dangerous-instructions, type=dangerousInstructions',
    '- id=safety-editorial-violation, type=fundamentalEditorialViolation',
    '',
    'Exact JSON shape:',
    '{"findings":[{"id":"...","type":"...","verdict":"present|absent|uncertain","evidenceText":"exact substring or null"}]}',
  ].join('\n')

  const userPrompt = [
    'Analyze this Flash document for safety findings.',
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

function validateCompleteSafetyOutput(
  output:
    FlashSafetySemanticOutput,
): void {
  if (
    output.findings.length !==
    EXPECTED_SAFETY_FINDINGS.length
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
    EXPECTED_SAFETY_FINDINGS.length
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  for (
    const expected
    of EXPECTED_SAFETY_FINDINGS
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

export function createFlashSafetySemanticProducer({
  executor,
  provider,
  model,
}: FlashSafetySemanticProducerOptions):
  FlashSemanticEvidenceProducer<
    FlashSafetyEvidenceInput
  > {
  return {
    descriptor: {
      kind:
        'safety',

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
        buildFlashSafetySemanticPrompt(
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
        parseFlashSafetySemanticOutput(
          raw,
        )

      validateCompleteSafetyOutput(
        output,
      )

      return toFlashSafetyEvidenceInput({
        document,
        output,
      })
    },
  }
}
