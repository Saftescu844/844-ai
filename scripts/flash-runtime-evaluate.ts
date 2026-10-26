export {}

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
Flash runtime evaluator — read-only

Usage:
  pnpm exec tsx scripts/flash-runtime-evaluate.ts \\
    --flash-id <id> \\
    --model <anthropic-model> \\
    --allow-provider-requests

Safety:
  - does not write to Payload
  - does not publish
  - does not change editorialStatus
  - does not change automationDecision
  - does not call the legacy publisher
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

  // Validate CLI arguments and explicit permissions before loading Payload/provider modules.
  // A rejected or help-only invocation must not evaluate the application import graph.
  const [
    { default: Anthropic }, { getPayload }, { default: config },
    { evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly },
    { createAnthropicFlashContradictionSemanticProducer },
    { createAnthropicFlashExtraordinaryClaimSemanticProducer },
    { createAnthropicFlashFactualClaimExtractionSemanticProducer },
    { createAnthropicFlashFactualVerificationSemanticProducer },
    { createAnthropicFlashMedicalInterpretationSemanticProducer },
    { createAnthropicFlashRegulatoryStatusSemanticProducer },
    { createAnthropicFlashSafetySemanticProducer },
  ] = await Promise.all([
    import('@anthropic-ai/sdk'), import('payload'), import('@payload-config'),
    import('@/lib/flash/semanticEvidence/payloadProducedFactualRuntimeReadOnly'),
    import('@/lib/flash/semanticEvidence/anthropicContradictionSemanticProducer'),
    import('@/lib/flash/semanticEvidence/anthropicExtraordinaryClaimSemanticProducer'),
    import('@/lib/flash/semanticEvidence/anthropicFactualClaimExtractionSemanticProducer'),
    import('@/lib/flash/semanticEvidence/anthropicFactualVerificationSemanticProducer'),
    import('@/lib/flash/semanticEvidence/anthropicMedicalInterpretationSemanticProducer'),
    import('@/lib/flash/semanticEvidence/anthropicRegulatoryStatusSemanticProducer'),
    import('@/lib/flash/semanticEvidence/anthropicSafetySemanticProducer'),
  ])

  /**
   * Clientul este creat numai după toate guard-urile.
   *
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
    'flash-runtime-cli',
    flashId,
    Date.now(),
  ].join(
    ':',
  )

  console.log(
    'FLASH_RUNTIME_READ_ONLY_START',
  )

  console.log({
    flashId,
    runId,
    model,
    readOnly:
      true,
  })

  const result =
    await evaluateFlashRuntimeWithProducedFactualEvidenceByIdReadOnly({
      payload,

      flashId,

      runId,

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

  console.log(
    'FLASH_RUNTIME_READ_ONLY_RESULT',
  )

  console.dir(
    {
      flashId,

      sourceVerification: {
        coverage:
          result
            .factualSourceVerification
            .verificationCoverage,

        passed:
          result
            .factualSourceVerification
            .completeDecisionEvidence
            ?.sourceVerificationPassed ??
          null,

        retrievalCount:
          result
            .factualSourceVerification
            .verification
            ?.retrievals
            .length ??
          0,
      },

      factualCorpus: {
        complete:
          result
            .factualSourceCorpus
            .complete,

        documents:
          result
            .factualSourceCorpus
            .documents
            .length,

        issues:
          result
            .factualSourceCorpus
            .issues,
      },

      factualChunks:
        result
          .factualChunks
          .length,

      factualEvidenceSetComplete:
        result
          .factualEvidenceSetComplete,

      factualClaimExtraction:
        result
          .factualClaimExtractionProduction,

      factualVerification:
        result
          .factualVerificationProduction,

      semanticProduction: {
        safety:
          result
            .semanticRuntime
            .safetyProduction,

        medicalInterpretation:
          result
            .semanticRuntime
            .medicalInterpretationProduction,

        extraordinaryClaim:
          result
            .semanticRuntime
            .extraordinaryClaimProduction,

        regulatoryStatus:
          result
            .semanticRuntime
            .regulatoryStatusProduction,

        contradictions:
          result
            .semanticRuntime
            .contradictionProduction,
      },

      decision:
        result
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
    'FLASH_RUNTIME_READ_ONLY_OK',
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
        'FLASH_RUNTIME_READ_ONLY_FAILED',
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
