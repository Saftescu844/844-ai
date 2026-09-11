import type {
  Payload,
} from 'payload'

import {
  FLASH_ENGINE_MANUAL_QUEUE,
  FLASH_ENGINE_TASK_SLUG,
} from '@/lib/flash/jobs/queueFlashEngineEvaluationJob'

import {
  assertFlashEngineRunStagingEnvironment,
} from '@/lib/flash/jobs/runFlashEngineEvaluationJobByID'

type FlashEngineRunNextPayload =
  Pick<
    Payload,
    'jobs'
  >

export interface RunFlashEngineManualQueueOnceOptions {
  payloadFactory:
    () => Promise<FlashEngineRunNextPayload>

  allowJobRun:
    boolean

  allowProviderRequests:
    boolean

  environment?:
    NodeJS.ProcessEnv
}

/**
 * Execută cel mult un job Flash Engine eligibil din coada manuală.
 *
 * Intenționat NU:
 * - caută sau execută joburi din alte cozi;
 * - execută alte task-uri Payload;
 * - reîncearcă joburi deja încercate;
 * - execută joburi fără autorizarea providerului serializată în input;
 * - publică sau modifică FlashAI direct;
 * - adaugă scheduling/cron/retry suplimentar.
 */
export async function runFlashEngineManualQueueOnce({
  payloadFactory,
  allowJobRun,
  allowProviderRequests,
  environment =
    process.env,
}: RunFlashEngineManualQueueOnceOptions) {
  /*
   * Guard 1:
   * nicio inițializare Payload înainte de autorizarea explicită
   * a execuției unui job din coada manuală.
   */
  if (
    allowJobRun !==
    true
  ) {
    throw new Error(
      'Flash Engine manual queue execution is blocked.',
    )
  }

  /*
   * Guard 2:
   * orice job eligibil poate ajunge la provider,
   * deci runner-ul cere autorizare separată.
   */
  if (
    allowProviderRequests !==
    true
  ) {
    throw new Error(
      'Provider requests are not authorized for Flash Engine manual queue execution.',
    )
  }

  /*
   * Guard 3:
   * reutilizăm exact restricția deja validată pentru run-by-ID:
   * - target Railway STAGING exact;
   * - PAYLOAD_DB_PUSH=false;
   * - ANTHROPIC_API_KEY prezentă.
   */
  assertFlashEngineRunStagingEnvironment(
    environment,
  )

  const payload =
    await payloadFactory()

  /*
   * Payload face claim-ul nativ al jobului, evitând un read-then-run
   * concurent. Limităm invocarea la un singur job și filtrăm explicit:
   * - task-ul Flash Engine;
   * - zero încercări anterioare;
   * - autorizarea providerului stocată în job.
   *
   * Task-ul evaluateFlashEngine verifică din nou allowProviderRequests,
   * deci acesta rămâne un al doilea nivel independent de guard.
   */
  const result =
    await payload.jobs.run({
      queue:
        FLASH_ENGINE_MANUAL_QUEUE,

      limit:
        1,

      sequential:
        true,

      overrideAccess:
        true,

      where: {
        and: [
          {
            taskSlug: {
              equals:
                FLASH_ENGINE_TASK_SLUG,
            },
          },
          {
            totalTried: {
              equals:
                0,
            },
          },
          {
            'input.allowProviderRequests': {
              equals:
                true,
            },
          },
        ],
      },
    })

  const statuses =
    Object.entries(
      result.jobStatus ??
        {},
    )

  /*
   * O coadă goală este un rezultat normal pentru un runner one-shot.
   * Acest comportament permite reutilizarea ulterioară într-un worker
   * periodic fără a transforma "nimic de lucru" într-o eroare.
   */
  if (
    statuses.length ===
    0
  ) {
    return {
      result,

      executed:
        false as const,

      jobId:
        null,

      executionStatus:
        null,

      task:
        FLASH_ENGINE_TASK_SLUG,

      queue:
        FLASH_ENGINE_MANUAL_QUEUE,
    }
  }

  /*
   * limit: 1 ar trebui să facă imposibil acest caz.
   * Păstrăm guard-ul defensiv pentru a nu raporta succes ambiguu.
   */
  if (
    statuses.length !==
    1
  ) {
    throw new Error(
      `Flash Engine manual queue runner returned ${String(statuses.length)} job statuses; expected at most one.`,
    )
  }

  const [
    jobId,
    execution,
  ] =
    statuses[0]

  if (
    execution.status !==
    'success'
  ) {
    throw new Error(
      `Flash Engine manual queue job ${jobId} execution failed with status: ${execution.status}.`,
    )
  }

  return {
    result,

    executed:
      true as const,

    jobId,

    executionStatus:
      execution.status,

    task:
      FLASH_ENGINE_TASK_SLUG,

    queue:
      FLASH_ENGINE_MANUAL_QUEUE,
  }
}
