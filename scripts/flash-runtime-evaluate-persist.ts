import Anthropic from '@anthropic-ai/sdk'
import { getPayload } from 'payload'

import config from '@payload-config'

import {
  evaluateFlashRuntimeWithProducedFactualEvidenceAndAuditPersistence,
} from '@/lib/flash/audit/payloadProducedFactualRuntimeWithAuditPersistence'

import {
  createAnthropicFlashContradictionSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicContradictionSemanticProducer'

import {
  createAnthropicFlashExtraordinaryClaimSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicExtraordinaryClaimSemanticProducer'

import {
  createAnthropicFlashFactualClaimExtractionSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicFactualClaimExtractionSemanticProducer'

import {
  createAnthropicFlashFactualVerificationSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicFactualVerificationSemanticProducer'

import {
  createAnthropicFlashMedicalInterpretationSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicMedicalInterpretationSemanticProducer'

import {
  createAnthropicFlashRegulatoryStatusSemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicRegulatoryStatusSemanticProducer'

import {
  createAnthropicFlashSafetySemanticProducer,
} from '@/lib/flash/semanticEvidence/anthropicSafetySemanticProducer'

const ENGINE_VERSION =
  'flash-runtime-persist-cli-v1'

function argument(
  name: string,
): string | null {
  const index =
    process.argv.indexOf(
      name,
    )

  if (
    index === -1 ||
    index + 1 >=
      process.argv.length
  ) {
    return null
  }

  const value =
    process.argv[
      index + 1
    ]?.trim()

  if (
    !value ||
    value.startsWith(
      '--',
    )
  ) {
    return null
  }

  return value
}

function hasFlag(
  name: string,
): boolean {
  return process.argv.includes(
    name,
  )
}

function printHelp(): void {
  console.log(`
Flash runtime evaluator — persistent audit

Usage:
  pnpm exec tsx scripts/flash-runtime-evaluate-persist.ts \\
    --flash-id <id> \\
    --model <anthropic-model> \\
    --allow-audit-write \\
    --allow-provider-requests

Writes:
  - creates/updates only FlashEngineRuns audit records

Does NOT:
  - modify FlashAI
  - change editorialStatus
  - change automationDecision
  - publish or unpublish
  - call the legacy publisher

Safety:
  - audit writes are blocked unless
    --allow-audit-write is explicitly supplied
  - provider requests are blocked unless
    --allow-provider-requests is explicitly supplied

Environment:
  ANTHROPIC_API_KEY
`)
}

async function main() {
  if (
    hasFlag(
      '--help',
    ) ||
    hasFlag(
      '-h',
    )
  ) {
    printHelp()
    return
  }

  const flashIdRaw =
    argument(
      '--flash-id',
    )

  const model =
    argument(
      '--model',
    )

  const allowAuditWrite =
    hasFlag(
      '--allow-audit-write',
    )

  const allowProviderRequests =
    hasFlag(
      '--allow-provider-requests',
    )

  if (!flashIdRaw) {
    throw new Error(
      'Missing required --flash-id',
    )
  }

  const flashId =
    Number(
      flashIdRaw,
    )

  if (
    !Number.isInteger(
      flashId,
    ) ||
    flashId <= 0
  ) {
    throw new Error(
      `Invalid --flash-id: ${flashIdRaw}`,
    )
  }

  if (!model) {
    throw new Error(
      'Missing required --model',
    )
  }

  /**
   * Guard-ul de write este verificat înainte de:
   * - getPayload()
   * - construirea clientului provider
   * - orice evaluare
   */
  if (
    !allowAuditWrite
  ) {
    throw new Error(
      [
        'Audit writes are blocked.',
        'Re-run only after explicit approval with',
        '--allow-audit-write.',
      ].join(
        ' ',
      ),
    )
  }

  if (
    !allowProviderRequests
  ) {
    throw new Error(
      [
        'Provider requests are blocked.',
        'Re-run only after explicit approval with',
        '--allow-provider-requests.',
      ].join(
        ' ',
      ),
    )
  }

  const apiKey =
    process.env
      .ANTHROPIC_API_KEY
      ?.trim()

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured.',
    )
  }

  /**
   * Clientul este creat numai după toate guard-urile.
   * Constructorul nu execută request.
   */
  const client =
    new Anthropic({
      apiKey,
    })

  const producerOptions = {
    client,
    model,
  }

  const payload =
    await getPayload({
      config,
    })

  const runId = [
    'flash-runtime-persist-cli',
    flashId,
    Date.now(),
  ].join(
    ':',
  )

  console.log(
    'FLASH_RUNTIME_PERSIST_START',
  )

  console.log({
    flashId,
    runId,
    provider:
      'anthropic',
    model,
    engineVersion:
      ENGINE_VERSION,
    auditWrite:
      true,
    publish:
      false,
  })

  const result =
    await evaluateFlashRuntimeWithProducedFactualEvidenceAndAuditPersistence({
      payload,

      flashId,

      runId,

      provider:
        'anthropic',

      model,

      engineVersion:
        ENGINE_VERSION,

      factualClaimExtractionProducer:
        createAnthropicFlashFactualClaimExtractionSemanticProducer(
          producerOptions,
        ),

      factualVerificationProducer:
        createAnthropicFlashFactualVerificationSemanticProducer(
          producerOptions,
        ),

      safetyProducer:
        createAnthropicFlashSafetySemanticProducer(
          producerOptions,
        ),

      medicalInterpretationProducer:
        createAnthropicFlashMedicalInterpretationSemanticProducer(
          producerOptions,
        ),

      extraordinaryClaimProducer:
        createAnthropicFlashExtraordinaryClaimSemanticProducer(
          producerOptions,
        ),

      regulatoryStatusProducer:
        createAnthropicFlashRegulatoryStatusSemanticProducer(
          producerOptions,
        ),

      contradictionProducer:
        createAnthropicFlashContradictionSemanticProducer(
          producerOptions,
        ),

      semanticEvidence:
        {},
    })

  const evaluation =
    result.evaluation

  console.log(
    'FLASH_RUNTIME_PERSIST_RESULT',
  )

  console.dir(
    {
      flashId,

      runId,

      audit: {
        id:
          result.auditRun.id,

        status:
          result.auditRun.status,

        decision:
          result.auditRun.decision,
      },

      sourceVerification: {
        coverage:
          evaluation
            .factualSourceVerification
            .verificationCoverage,

        passed:
          evaluation
            .factualSourceVerification
            .completeDecisionEvidence
            ?.sourceVerificationPassed ??
          null,

        retrievalCount:
          evaluation
            .factualSourceVerification
            .verification
            ?.retrievals
            .length ??
          0,
      },

      factualCorpus: {
        complete:
          evaluation
            .factualSourceCorpus
            .complete,

        documents:
          evaluation
            .factualSourceCorpus
            .documents
            .length,

        issues:
          evaluation
            .factualSourceCorpus
            .issues,
      },

      factualChunks:
        evaluation
          .factualChunks
          .length,

      factualEvidenceSetComplete:
        evaluation
          .factualEvidenceSetComplete,

      decision:
        evaluation
          .semanticRuntime
          .runtime
          .runtimeDecision
          .decision,
    },
    {
      depth:
        null,
    },
  )

  console.log(
    'FLASH_RUNTIME_PERSIST_OK',
  )
}

main()
  .then(
    () => {
      process.exit(
        0,
      )
    },
  )
  .catch(
    error => {
      console.error(
        'FLASH_RUNTIME_PERSIST_FAILED',
      )

      console.error(
        error instanceof Error
          ? error.message
          : error,
      )

      process.exit(
        1,
      )
    },
  )
