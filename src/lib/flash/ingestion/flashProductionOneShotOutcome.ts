export const PRODUCTION_ONE_SHOT_OUTCOME_MARKER = 'FLASH_RSS_PRODUCTION_ONE_SHOT_OUTCOME '
const SKIP_REASONS = ['no_candidate', 'event_identity_not_grounded', 'strong_duplicate', 'article_publication_not_current'] as const
export type ProductionOneShotSkipReason = typeof SKIP_REASONS[number]
export type ProductionOneShotOutcome = { outcome: 'pair_created' } | { outcome: 'skipped'; reason: ProductionOneShotSkipReason }

export function isProductionOneShotSkipReason(value: unknown): value is ProductionOneShotSkipReason {
  return typeof value === 'string' && SKIP_REASONS.some(reason => reason === value)
}

/** Only fixed categories cross the child boundary, never provider/source diagnostics. */
export function formatProductionOneShotOutcome(result: ProductionOneShotOutcome): string {
  return PRODUCTION_ONE_SHOT_OUTCOME_MARKER + JSON.stringify(result) + '\n'
}

export function parseProductionOneShotOutcome(stdout: string): ProductionOneShotOutcome | {
  outcome: 'failed'; reason: 'terminal_outcome_missing' | 'terminal_outcome_invalid'
} {
  const records = stdout.split(/\r?\n/).filter(line => line.startsWith(PRODUCTION_ONE_SHOT_OUTCOME_MARKER))
  if (records.length === 0) return { outcome: 'failed', reason: 'terminal_outcome_missing' }
  if (records.length !== 1) return { outcome: 'failed', reason: 'terminal_outcome_invalid' }
  try {
    const value: unknown = JSON.parse(records[0].slice(PRODUCTION_ONE_SHOT_OUTCOME_MARKER.length))
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const row = value as Record<string, unknown>
      if (row.outcome === 'pair_created' && Object.keys(row).length === 1) return { outcome: 'pair_created' }
      if (row.outcome === 'skipped' && isProductionOneShotSkipReason(row.reason) && Object.keys(row).length === 2) {
        return { outcome: 'skipped', reason: row.reason }
      }
    }
  } catch { /* Raw or malformed child output is never included in an error. */ }
  return { outcome: 'failed', reason: 'terminal_outcome_invalid' }
}
