import type {
  FlashMedicalInterpretationEvidenceInput,
  FlashMedicalInterpretationFindingType,
} from '../runtimeEvidence/medicalInterpretationEvidence'

import type {
  FlashSemanticDocument,
} from './semanticDocument'

import {
  FlashSemanticEvidenceProducerError,
  type FlashSemanticEvidenceProducer,
} from './semanticEvidenceProducer'

import {
  parseFlashMedicalInterpretationSemanticOutput,
  toFlashMedicalInterpretationEvidenceInput,
  type FlashMedicalInterpretationSemanticOutput,
} from './medicalInterpretationSemanticOutput'

import type {
  FlashSemanticTextExecutor,
} from './semanticTextExecutor'

interface ExpectedMedicalInterpretationFinding {
  id:
    string

  type:
    FlashMedicalInterpretationFindingType
}

const EXPECTED_MEDICAL_INTERPRETATION_FINDINGS:
  readonly ExpectedMedicalInterpretationFinding[] = [
    {
      id:
        'medical-clinical-significance',

      type:
        'clinicalSignificance',
    },
    {
      id:
        'medical-patient-applicability',

      type:
        'patientApplicability',
    },
    {
      id:
        'medical-comparative-clinical-claim',

      type:
        'comparativeClinicalClaim',
    },
    {
      id:
        'medical-benefit-risk',

      type:
        'benefitRiskInterpretation',
    },
    {
      id:
        'medical-clinical-decision',

      type:
        'clinicalDecisionImplication',
    },
    {
      id:
        'medical-other-interpretation',

      type:
        'otherMedicalInterpretation',
    },
  ]

export interface FlashMedicalInterpretationSemanticProducerOptions {
  executor:
    FlashSemanticTextExecutor

  provider:
    string

  model:
    string
}

export interface FlashMedicalInterpretationSemanticPrompt {
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
 * interpretare medicală.
 *
 * Detectorul identifică exclusiv dacă documentul
 * conține interpretare clinică relevantă.
 *
 * Nu decide publicarea.
 */
export function buildFlashMedicalInterpretationSemanticPrompt(
  document:
    FlashSemanticDocument,
): FlashMedicalInterpretationSemanticPrompt {
  const systemPrompt = [
    'You are a medical interpretation evidence detector for an editorial Flash document.',
    '',
    'Your job is ONLY to identify whether the supplied document contains important medical or clinical interpretation.',
    'You do NOT decide whether the document should be published.',
    'You do NOT return AUTO, REVIEW, BLOCK, publication status, risk score, or editorial decision.',
    '',
    'A document being health-related does NOT by itself mean that important medical interpretation is present.',
    'Medical terminology alone does NOT make a finding present.',
    'Base each verdict on what the supplied text actually says.',
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
    'Interpretation categories:',
    '- clinicalSignificance: interpretation of what a result means clinically;',
    '- patientApplicability: interpretation of whether findings apply to patients, groups, or clinical situations;',
    '- comparativeClinicalClaim: clinical comparison between interventions, tests, technologies, outcomes, or standards of care;',
    '- benefitRiskInterpretation: interpretation balancing clinical benefit, harm, risk, safety, or trade-offs;',
    '- clinicalDecisionImplication: interpretation that could affect diagnosis, treatment, monitoring, referral, or another clinical decision;',
    '- otherMedicalInterpretation: another materially important clinical interpretation not covered above.',
    '',
    'evidenceText rules:',
    '- for present or uncertain, use a short exact verbatim substring from the supplied title, excerpt, or bodyText when possible;',
    '- never paraphrase evidenceText;',
    '- never invent evidenceText;',
    '- use null when no exact supporting fragment is available;',
    '- for absent, use null.',
    '',
    'Required findings:',
    '- id=medical-clinical-significance, type=clinicalSignificance',
    '- id=medical-patient-applicability, type=patientApplicability',
    '- id=medical-comparative-clinical-claim, type=comparativeClinicalClaim',
    '- id=medical-benefit-risk, type=benefitRiskInterpretation',
    '- id=medical-clinical-decision, type=clinicalDecisionImplication',
    '- id=medical-other-interpretation, type=otherMedicalInterpretation',
    '',
    'Exact JSON shape:',
    '{"findings":[{"id":"...","type":"...","verdict":"present|absent|uncertain","evidenceText":"exact substring or null"}]}',
  ].join('\n')

  const userPrompt = [
    'Analyze this Flash document for important medical interpretation.',
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

function validateCompleteMedicalInterpretationOutput(
  output:
    FlashMedicalInterpretationSemanticOutput,
): void {
  if (
    output.findings.length !==
    EXPECTED_MEDICAL_INTERPRETATION_FINDINGS.length
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
    EXPECTED_MEDICAL_INTERPRETATION_FINDINGS.length
  ) {
    throw new FlashSemanticEvidenceProducerError(
      'invalid_output',
    )
  }

  for (
    const expected
    of EXPECTED_MEDICAL_INTERPRETATION_FINDINGS
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

export function createFlashMedicalInterpretationSemanticProducer({
  executor,
  provider,
  model,
}: FlashMedicalInterpretationSemanticProducerOptions):
  FlashSemanticEvidenceProducer<
    FlashMedicalInterpretationEvidenceInput
  > {
  return {
    descriptor: {
      kind:
        'medicalInterpretation',

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
        buildFlashMedicalInterpretationSemanticPrompt(
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
        parseFlashMedicalInterpretationSemanticOutput(
          raw,
        )

      validateCompleteMedicalInterpretationOutput(
        output,
      )

      return toFlashMedicalInterpretationEvidenceInput({
        document,
        output,
      })
    },
  }
}
