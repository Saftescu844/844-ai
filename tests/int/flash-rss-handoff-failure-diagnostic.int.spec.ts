// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { diagnoseRssHandoffFailure } from '@/lib/flash/ingestion/rssHandoffFailureDiagnostic'
import { FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'

describe('bounded RSS handoff failure diagnostics', () => {
  it.each([
    ['Pre-persistence classification failed: invalid_input.', 'classification', 'invalid_input'],
    ['Pre-persistence editorial generation failed: provider_refusal.', 'editorial-generation', 'provider_refusal'],
    ['Pre-persistence editorial quality review failed: invalid_output_language. Diagnostics: {"private":"secret"}.', 'editorial-quality-review', 'invalid_output_language'],
    ['Pre-persistence editorial quality review failed closed: editorial_quality_review_retention_floor_breach.', 'editorial-quality-review', 'invalid_output_quality_review_retention'],
  ])('extracts constants from %s', (output, phase, reason) => {
    expect(diagnoseRssHandoffFailure(output)).toEqual({ phase, reason })
  })

  it.each([
    'secret credentials and generated article text',
    'Pre-persistence editorial generation failed: private_api_key.',
    'prefix Pre-persistence editorial generation failed: provider_refusal.',
    'Pre-persistence editorial generation failed: provider_refusal.secret',
  ])('does not relay arbitrary or partial messages', output => {
    expect(diagnoseRssHandoffFailure(output)).toEqual({ phase: 'unknown', reason: 'unclassified' })
  })

  it('persists the EN failure category, excludes child text and clears it on the next candidate', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 })
    const update = vi.fn().mockResolvedValue({ id: 1 })
    const lines: string[] = []
    const audit = new FlashRssRunDiagnostics(line => lines.push(line))
    await audit.start({ create, update } as unknown as Pick<Payload, 'create' | 'update'>, 'test', 'test')
    await audit.checkpoint('generation-en', 8)
    audit.handoffFailure(diagnoseRssHandoffFailure('Pre-persistence editorial quality review failed: provider_error. Diagnostics: private secret'))
    await audit.finish(true, 'RSS_HANDOFF_FAILED')
    expect(update.mock.lastCall?.[0].data.evidenceSummary).toMatchObject({
      stage: 'generation-en', sourceId: 8,
      handoffFailurePhase: 'editorial-quality-review', handoffFailureReason: 'provider_error',
    })
    expect(JSON.stringify({ lines, calls: update.mock.calls })).not.toContain('private secret')
    audit.candidate(2, 8)
    await audit.checkpoint('generation-ro')
    expect(update.mock.lastCall?.[0].data.evidenceSummary).toMatchObject({
      handoffFailurePhase: null, handoffFailureReason: null,
    })
  })
})
