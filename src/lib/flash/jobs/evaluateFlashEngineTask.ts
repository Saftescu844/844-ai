import Anthropic from '@anthropic-ai/sdk'

import type {
  TaskConfig,
} from 'payload'

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

import type {
  FlashAutomationDecision,
} from '@/lib/flash/decisionEngine'

const PROVIDER =
  'anthropic'

const ENGINE_VERSION =
  'flash-payload-job-v1'

export interface EvaluateFlashEngineTaskInput {
  flashId:
    number

  model:
    string

  /**
   * Guard serializat împreună cu jobul.
   *
   * Un job din coadă nu are voie să producă request-uri
   * către provider decât dacă autorizarea a fost acordată
   * explicit la enqueue.
   */
  allowProviderRequests:
    boolean
}

export interface EvaluateFlashEngineTaskOutput {
  runId:
    string

  decision:
    FlashAutomationDecision
}

type EvaluateFlashEngineTaskContract = {
  input:
    EvaluateFlashEngineTaskInput

  output:
    EvaluateFlashEngineTaskOutput
}

/**
 * Task tehnic Payload pentru evaluarea unui Flash existent.
 *
 * Poate:
 * - citi FlashAI și Surse prin runtime-ul existent;
 * - executa producerii Anthropic numai după guard explicit;
 * - scrie exclusiv auditul tehnic FlashEngineRuns
 *   prin coordinatorul persistent existent.
 *
 * Nu:
 * - modifică FlashAI;
 * - schimbă editorialStatus;
 * - schimbă automationDecision;
 * - publică;
 * - face unpublish;
 * - apelează publisher-ul legacy;
 * - implementează retry/idempotency suplimentar.
 */
export const EvaluateFlashEngineTask:
  TaskConfig<EvaluateFlashEngineTaskContract> = {
    slug:
      'evaluateFlashEngine',

    label:
      'Evaluate Flash Engine',

    retries:
      0,

    inputSchema: [
      {
        name:
          'flashId',
        type:
          'number',
        required:
          true,
      },
      {
        name:
          'model',
        type:
          'text',
        required:
          true,
      },
      {
        name:
          'allowProviderRequests',
        type:
          'checkbox',
        required:
          true,
        defaultValue:
          false,
      },
    ],

    outputSchema: [
      {
        name:
          'runId',
        type:
          'text',
        required:
          true,
      },
      {
        name:
          'decision',
        type:
          'select',
        required:
          true,
        options: [
          {
            label:
              'Auto Publish',
            value:
              'autoPublish',
          },
          {
            label:
              'Review',
            value:
              'review',
          },
          {
            label:
              'Blocked',
            value:
              'blocked',
          },
        ],
      },
    ],

    handler:
      async ({
        input,
        job,
        req,
      }) => {
        const {
          flashId,
          model: rawModel,
          allowProviderRequests,
        } = input

        if (
          !Number.isInteger(
            flashId,
          ) ||
          flashId <= 0
        ) {
          throw new Error(
            `Invalid Flash ID: ${String(flashId)}`,
          )
        }

        const model =
          rawModel.trim()

        if (!model) {
          throw new Error(
            'Anthropic model is required.',
          )
        }

        /**
         * Guard-ul provider este verificat înainte de:
         * - citirea cheii API;
         * - construirea clientului Anthropic;
         * - construirea producerilor;
         * - orice evaluare.
         */
        if (
          allowProviderRequests !==
          true
        ) {
          throw new Error(
            'Provider requests are blocked for this Flash Engine job.',
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
         * Constructorul clientului nu execută request.
         * Request-urile pot apărea numai ulterior,
         * prin producerii injectați runtime-ului.
         */
        const client =
          new Anthropic({
            apiKey,
          })

        const producerOptions = {
          client,
          model,
        }

        /**
         * runId determinist pentru corelarea:
         * payload_jobs.id <-> flash_engine_runs.run_id
         */
        const runId =
          `flash-engine-job:${String(job.id)}`

        const result =
          await evaluateFlashRuntimeWithProducedFactualEvidenceAndAuditPersistence({
            payload:
              req.payload,

            flashId,

            runId,

            provider:
              PROVIDER,

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

        return {
          output: {
            runId,

            decision:
              result
                .evaluation
                .semanticRuntime
                .runtime
                .runtimeDecision
                .decision
                .decision,
          },
        }
      },
  }
