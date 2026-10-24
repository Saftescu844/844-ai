import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import { serializeStructuredRuntimeEvent } from '@/lib/observability/structuredRuntimeEvent'

type AuditPayload = Pick<Payload, 'create' | 'update'>
export type RssRunStage = 'bootstrap' | 'database' | 'source-planning' | 'feed-retrieval' |
  'candidate-selection' | 'generation-ro' | 'generation-en' | 'pair-persistence'
export type RssRunOutcome = 'empty' | 'no-eligible-candidate' | 'pair-created'
export type RssSkipReason = 'event_identity_not_grounded' | 'strong_duplicate' |
  'article_retrieval_http_error' | 'editorial_output_too_short' | 'editorial_output_too_long'

export type RssControlledFailureCode = 'RSS_CHILD_SIGNAL' | 'RSS_CHILD_OUTPUT_LIMIT' | 'RSS_HANDOFF_FAILED'
export class FlashRssControlledFailure extends Error {
  constructor(readonly code: RssControlledFailureCode) {
    super(code)
    this.name = 'FlashRssControlledFailure'
  }
}

const failureCodes: Record<RssRunStage, string> = {
  bootstrap: 'RSS_BOOTSTRAP_FAILED', database: 'RSS_DATABASE_FAILED',
  'source-planning': 'RSS_SOURCE_PLANNING_FAILED', 'feed-retrieval': 'RSS_FEED_RETRIEVAL_FAILED',
  'candidate-selection': 'RSS_CANDIDATE_SELECTION_FAILED', 'generation-ro': 'RSS_RO_HANDOFF_FAILED',
  'generation-en': 'RSS_EN_HANDOFF_FAILED', 'pair-persistence': 'RSS_PAIR_PERSISTENCE_FAILED',
}

/** Only controlled metadata is accepted: no Error, URL, source text or provider output. */
export class FlashRssRunDiagnostics {
  readonly runId = `flash-rss:${randomUUID()}`
  private stage: RssRunStage = 'bootstrap'
  private readonly startedMs: number
  private payload?: AuditPayload
  private recordId?: number
  private attemptedCount = 0
  private skippedCount = 0
  private sourceId: number | null = null
  private outcome: RssRunOutcome | null = null
  private lastSkipReason: RssSkipReason | null = null
  private roId: number | null = null
  private enId: number | null = null
  private selectedSourceCount = 0
  private discoveredCount = 0
  private eligibleCandidateCount = 0
  private filteredExistingCandidateCount = 0
  private filteredRememberedRejectedCandidateCount = 0
  private filteredDailyBudgetCandidateCount = 0
  private existingSourceUrlCount = 0
  private rememberedRejectedUrlCount = 0
  private finished = false

  constructor(
    private readonly emit: (line: string) => void = console.log,
    private readonly now: () => number = Date.now,
  ) {
    this.startedMs = now()
    this.log('started')
  }

  private summary() {
    return { runKind: 'rss-ingestion', stage: this.stage, sourceId: this.sourceId,
      selectedSourceCount: this.selectedSourceCount, discoveredCount: this.discoveredCount,
      eligibleCandidateCount: this.eligibleCandidateCount,
      filteredExistingCandidateCount: this.filteredExistingCandidateCount,
      filteredRememberedRejectedCandidateCount: this.filteredRememberedRejectedCandidateCount,
      filteredDailyBudgetCandidateCount: this.filteredDailyBudgetCandidateCount,
      existingSourceUrlCount: this.existingSourceUrlCount, rememberedRejectedUrlCount: this.rememberedRejectedUrlCount,
      attemptedCount: this.attemptedCount, skippedCount: this.skippedCount,
      outcome: this.outcome, lastSkipReason: this.lastSkipReason, roId: this.roId, enId: this.enId,
      durationMs: Math.max(0, this.now() - this.startedMs) }
  }

  private log(status: 'started' | 'success' | 'noop' | 'failed', errorCode?: string) {
    this.emit(serializeStructuredRuntimeEvent({ event: 'flash.rss.run', component: 'flash-rss-stage-next',
      status, correlationId: this.runId, data: { ...this.summary(), errorCode } }))
  }

  async start(payload: AuditPayload, model: string, engineVersion: string) {
    // Called only AFTER environment/database identity guards and Payload initialization.
    const record = await payload.create({ collection: 'flash-engine-runs', overrideAccess: true,
      data: { runKind: 'rss-ingestion', runId: this.runId, status: 'running',
        provider: 'openai', model, engineVersion,
        startedAt: new Date(this.startedMs).toISOString(), evidenceSummary: this.summary() } })
    this.payload = payload
    this.recordId = record.id
  }

  async checkpoint(stage: RssRunStage, sourceId: number | null = this.sourceId) {
    this.stage = stage
    this.sourceId = sourceId
    this.log('started')
    if (this.payload && this.recordId != null) {
      await this.payload.update({ collection: 'flash-engine-runs', id: this.recordId,
        overrideAccess: true, data: { evidenceSummary: this.summary() } })
    }
  }

  scan(counts: { selectedSourceCount: number; discoveredCount: number; eligibleCandidateCount: number;
    filteredExistingCandidateCount: number; filteredRememberedRejectedCandidateCount: number;
    filteredDailyBudgetCandidateCount: number;
    existingSourceUrlCount: number; rememberedRejectedUrlCount: number }) {
    this.selectedSourceCount = counts.selectedSourceCount
    this.discoveredCount = counts.discoveredCount
    this.eligibleCandidateCount = counts.eligibleCandidateCount
    this.filteredExistingCandidateCount = counts.filteredExistingCandidateCount
    this.filteredRememberedRejectedCandidateCount = counts.filteredRememberedRejectedCandidateCount
    this.filteredDailyBudgetCandidateCount = counts.filteredDailyBudgetCandidateCount
    this.existingSourceUrlCount = counts.existingSourceUrlCount
    this.rememberedRejectedUrlCount = counts.rememberedRejectedUrlCount
  }

  setRememberedRejectedUrlCount(count: number) {
    this.rememberedRejectedUrlCount = count
  }

  candidate(attempt: number, sourceId: number) {
    this.attemptedCount = attempt
    this.sourceId = sourceId
  }

  skipped(reason: RssSkipReason) {
    this.skippedCount += 1
    this.lastSkipReason = reason
    this.log('noop', reason)
  }

  result(outcome: RssRunOutcome, pair?: { roId: number; enId: number }) {
    this.outcome = outcome
    this.roId = pair?.roId ?? null
    this.enId = pair?.enId ?? null
  }

  async finish(failed = false, controlledCode?: RssControlledFailureCode) {
    if (this.finished) return
    const errorCode = failed ? controlledCode ?? failureCodes[this.stage] : undefined
    // Print final controlled evidence even when the database is unavailable.
    this.log(failed ? 'failed' : this.outcome === 'pair-created' ? 'success' : 'noop', errorCode)
    if (this.payload && this.recordId != null) {
      try {
        await this.payload.update({ collection: 'flash-engine-runs', id: this.recordId, overrideAccess: true,
          data: { status: failed ? 'failed' : 'completed', completedAt: new Date(this.now()).toISOString(),
            evidenceSummary: this.summary(), errorCode: errorCode ?? null,
            errorMessage: failed ? `RSS execution stopped at ${this.stage}.` : null } })
      } catch {
        this.log('failed', 'RSS_AUDIT_FINALIZATION_FAILED')
        // The already-created record remains running; never manufacture a completed state.
        this.finished = true
        throw new Error('RSS_AUDIT_FINALIZATION_FAILED')
      }
    }
    this.finished = true
  }
}
