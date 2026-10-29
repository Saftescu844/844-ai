import { spawnSync } from 'node:child_process'
import { assessFlashPublicationFreshness } from './flashPublicationFreshness'

export const FLASH_PRODUCTION_HANDOFF_TIMEOUT_MS = 180_000

type HandoffFailureReason = 'event_identity_not_grounded' | 'strong_duplicate'
  | 'article_publication_not_current' | 'handoff_timeout' | 'handoff_failed'

export class FlashProductionOneShotHandoffError extends Error {
  constructor(readonly reason: HandoffFailureReason) {
    super(`Production one-shot handoff failed: ${reason}.`)
    this.name = 'FlashProductionOneShotHandoffError'
  }

  get controlledSkip(): boolean {
    return ['event_identity_not_grounded', 'strong_duplicate', 'article_publication_not_current'].includes(this.reason)
  }
}

/** Runs one read-only preparation process. Only the parent may persist both handoffs. */
export function runFlashProductionOneShotHandoff({
  sourceId, articleUrl, targetLanguage, model, outputPath, expectedServiceId,
  freshnessPolicy, classificationHandoffPath,
}: {
  sourceId: number
  articleUrl: string
  targetLanguage: 'ro' | 'en'
  model: string
  outputPath: string
  expectedServiceId: string
  freshnessPolicy: { now: number; maxAgeDays: number }
  classificationHandoffPath?: string
}, spawn: typeof spawnSync = spawnSync): void {
  // Validate bounds before a child could make any provider or database request.
  assessFlashPublicationFreshness(null, freshnessPolicy)
  if ((targetLanguage === 'en') !== Boolean(classificationHandoffPath)) {
    throw new Error('Production EN preparation requires the same-run RO classification handoff only.')
  }
  const result = spawn(process.execPath, [
    '--import', 'tsx', 'scripts/flash-html-article-prepersistence-dedup-preview.ts',
    '--source-id', String(sourceId), '--article-url', articleUrl,
    '--target-language', targetLanguage, '--require-grounded-event-identity',
    '--allow-production-one-shot', '--expected-production-service-id', expectedServiceId,
    '--allow-provider-requests', '--model', model,
    '--rss-freshness-now', new Date(freshnessPolicy.now).toISOString(),
    '--rss-max-age-days', String(freshnessPolicy.maxAgeDays),
    '--handoff-output', outputPath,
    ...(classificationHandoffPath ? ['--classification-handoff-input', classificationHandoffPath] : []),
  ], {
    cwd: process.cwd(), env: process.env, encoding: 'utf8',
    timeout: FLASH_PRODUCTION_HANDOFF_TIMEOUT_MS, killSignal: 'SIGKILL',
    maxBuffer: 20 * 1024 * 1024,
  })

  if (result.status === 0 && !result.error) return
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT') {
    throw new FlashProductionOneShotHandoffError('handoff_timeout')
  }
  const diagnostic = [result.stderr, result.stdout].join('\n')
  if (diagnostic.includes('FLASH_RSS_FRESHNESS_REJECTED:')) {
    throw new FlashProductionOneShotHandoffError('article_publication_not_current')
  }
  if (diagnostic.includes('does not have a grounded event identity required by this flow') ||
      diagnostic.includes('requires grounded event identity or a safe review-only pending identity')) {
    throw new FlashProductionOneShotHandoffError('event_identity_not_grounded')
  }
  if (diagnostic.includes('strong duplicate evidence exists')) {
    throw new FlashProductionOneShotHandoffError('strong_duplicate')
  }
  // Do not forward article text, raw model output, provider errors or credentials to logs.
  throw new FlashProductionOneShotHandoffError('handoff_failed')
}
