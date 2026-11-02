// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { diagnoseRssHandoffFailure, summarizeRssHandoffExit } from '@/lib/flash/ingestion/rssHandoffFailureDiagnostic'
import { FlashRssRunDiagnostics } from '@/lib/flash/audit/flashRssRunDiagnostics'

describe('bounded RSS handoff failure diagnostics', () => {
  it('distinguishes an exit without an application failure marker without claiming its cause', () => {
    expect(summarizeRssHandoffExit({ status: 13, signal: null, stdout: '', stderr: '' })).toEqual({
      exitCode: 13, signalled: false, processError: null, stdoutBytes: 0, stderrBytes: 0,
      applicationFailureMarker: false, unsettledAwaitWarning: false,
    })
  })

  it('records bounded facts for an application error without leaking its text or error object', () => {
    const result = summarizeRssHandoffExit({ status: 1, signal: null,
      stdout: 'private provider output',
      stderr: 'FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_FAILED\nprivate credential',
      error: Object.assign(new Error('private failure'), { code: 'private_code' }),
    })
    expect(result).toMatchObject({ exitCode: 1, applicationFailureMarker: true, processError: 'execution_error' })
    expect(JSON.stringify(result)).not.toContain('private')
  })

  it('recognizes a Node warning independently of the exit code and requires an exact marker line', () => {
    const result = summarizeRssHandoffExit({ status: 13, signal: null, stdout: '',
      stderr: 'Warning: Detected unsettled top-level await at file:///private/path.ts:2\nprefix FLASH_HTML_ARTICLE_PREPERSISTENCE_DEDUP_PREVIEW_FAILED\n',
    })
    expect(result).toMatchObject({ exitCode: 13, unsettledAwaitWarning: true, applicationFailureMarker: false })
    expect(JSON.stringify(result)).not.toContain('/private/')
  })

  it('records signal and output-limit precedence facts with UTF-8 byte counts', () => {
    expect(summarizeRssHandoffExit({ status: null, signal: 'SIGTERM', error: { code: 'ENOBUFS' }, stdout: 'ă', stderr: '' }))
      .toMatchObject({ exitCode: null, signalled: true, processError: 'output_limit', stdoutBytes: 2, stderrBytes: 0 })
  })

  it.each([-1, 256, 1.5, NaN])('rejects an invalid exit code %s', status => {
    expect(summarizeRssHandoffExit({ status, signal: null, stdout: '', stderr: '' }).exitCode).toBeNull()
  })

  it.each([
    ['FLASH_MICROSOFT_RESEARCH_PAPER_EVIDENCE_UNAVAILABLE:retrieval_failed', 'article-extraction', 'article_primary_evidence_unavailable'],
    ['FLASH_MICROSOFT_RESEARCH_PAPER_EVIDENCE_UNAVAILABLE:unsupported_publication', 'article-extraction', 'article_primary_evidence_unavailable'],
    ['FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: description', 'article-extraction', 'article_layout_not_supported'],
    ['Pre-persistence classification failed: invalid_input.', 'classification', 'invalid_input'],
    ['Pre-persistence editorial generation failed: provider_refusal.', 'editorial-generation', 'provider_refusal'],
    ['Pre-persistence editorial quality review failed: invalid_output_language. Diagnostics: {"private":"secret"}.', 'editorial-quality-review', 'invalid_output_language'],
    ['Pre-persistence editorial quality review failed closed: editorial_quality_review_retention_floor_breach.', 'editorial-quality-review', 'invalid_output_quality_review_retention'],
  ])('extracts constants from %s', (output, phase, reason) => {
    expect(diagnoseRssHandoffFailure(output)).toEqual({ phase, reason })
  })

  it.each([
    'FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: private_api_key',
    'prefix FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: description',
    'FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: description.secret',
    'FLASH_UNESCO_ARTICLE_LAYOUT_UNSUPPORTED: canonical URL',
    'UNESCO article requires one lead.',
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
