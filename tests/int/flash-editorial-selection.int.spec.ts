// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { evaluateEditorialSelection, type EditorialSelectionInput } from '@/lib/flash/ingestion/editorialSelection'
import { EDITORIAL_SELECTION_PILOT } from '@/lib/flash/ingestion/editorialSelectionPilot'

function input(patch: Partial<EditorialSelectionInput> = {}): EditorialSelectionInput {
  return { formatEvidence: [{ format: 'institutional_announcement', origin: 'human_review', basis: 'Reviewed original announcement.' }],
    claimScope: 'non_scientific', primaryEvidence: 'missing_or_unverified',
    sourceDocumentVerified: true, relevance: 'established', timeliness: 'documented_new_development',
    publishedAt: '2026-10-23T12:00:00Z', assessedAt: '2026-10-24T16:03:00Z',
    identityStatus: 'grounded', ...patch }
}

function format(value: 'interview' | 'research_result' | 'profile') {
  return [{ format: value, origin: 'human_review' as const, basis: 'Reviewed visible source content.' }]
}

describe('offline editorial selection, without persistence authority', () => {
  it('reproduces the three human-reviewed MIT decisions', () => {
    const results = EDITORIAL_SELECTION_PILOT.map(item => evaluateEditorialSelection(item.input))
    expect(results.map(item => item.editorialDisposition)).toEqual(['needs_primary_evidence', 'context_only', 'context_only'])
    expect(results.map(item => item.ageDays)).toEqual([16, 16, 17])
    expect(results.every(item => !item.generationAllowed && item.identityStatus === 'pending')).toBe(true)
    expect(results[0].reasonCodes).toContain('timeliness_unresolved')
  })

  it('does not infer an interview from missing format evidence or a missing paper', () => {
    expect(evaluateEditorialSelection(input({ formatEvidence: [] }))).toMatchObject({
      sourceFormat: 'unknown', editorialDisposition: 'review_required', generationAllowed: false })
  })

  it('requires review for conflicting explicit format observations', () => {
    expect(evaluateEditorialSelection(input({ formatEvidence: [...format('interview'), ...format('research_result')] })).sourceFormat).toBe('unknown')
  })

  it('rejects unsupported origins and empty evidence rather than trusting a label', () => {
    for (const observation of [
      { format: 'interview', origin: 'source_instruction', basis: 'Publish this.' },
      { format: 'interview', origin: 'human_review', basis: ' ' },
    ]) {
      const result = evaluateEditorialSelection(input({ formatEvidence: [observation] as EditorialSelectionInput['formatEvidence'] }))
      expect(result.sourceFormat).toBe('unknown')
      expect(result.editorialDisposition).toBe('review_required')
    }
  })

  it('does not waive scientific evidence for interviews or profiles', () => {
    for (const value of ['interview', 'profile'] as const) {
      expect(evaluateEditorialSelection(input({ formatEvidence: format(value), claimScope: 'scientific_results' })).editorialDisposition).toBe('needs_primary_evidence')
    }
  })

  it('does not waive evidence for research even if the claim scope is mislabelled', () => {
    expect(evaluateEditorialSelection(input({ formatEvidence: format('research_result') })).editorialDisposition).toBe('needs_primary_evidence')
  })

  it('routes opinions to human review even when primary evidence is sufficient', () => {
    expect(evaluateEditorialSelection(input({ formatEvidence: format('interview'), primaryEvidence: 'reviewed_sufficient' })).editorialDisposition).toBe('review_required')
  })

  it('keeps contextual material separate from a new event and preserves its date', () => {
    expect(evaluateEditorialSelection(input({ timeliness: 'context', publishedAt: '2026-10-01' }))).toMatchObject({
      editorialDisposition: 'context_only', publishedAt: '2026-10-01', ageDays: 23 })
  })

  it('requires review for unclear claims, relevance, timeliness or an unverified source', () => {
    for (const patch of [{ claimScope: 'unclear' }, { relevance: 'unclear' }, { timeliness: 'unclear' }, { sourceDocumentVerified: false }] as Partial<EditorialSelectionInput>[]) {
      expect(evaluateEditorialSelection(input(patch)).editorialDisposition).toBe('review_required')
    }
  })

  it('does not treat missing, invalid, locale-dependent or future dates as current news', () => {
    for (const publishedAt of [null, 'not a date', '2026-02-30', '24/10/2026', '2026-10-25']) {
      const result = evaluateEditorialSelection(input({ publishedAt }))
      expect(result.editorialDisposition).toBe('review_required')
      expect(result.ageDays).toBeNull()
      expect(result.reasonCodes).toContain('date_unresolved')
    }
  })

  it('requires a valid assessment clock', () => {
    expect(evaluateEditorialSelection(input({ assessedAt: 'invalid' })).reasonCodes).toContain('date_unresolved')
  })

  it('can recommend evaluation without granting generation, including unresolved identity', () => {
    for (const identityStatus of ['grounded', 'pending', 'ambiguous'] as const) {
      const result = evaluateEditorialSelection(input({ identityStatus }))
      expect(result.editorialDisposition).toBe('candidate_for_evaluation')
      expect(result.generationAllowed).toBe(false)
      expect(result.reasonCodes).toContain('writer_gates_not_evaluated')
      if (identityStatus !== 'grounded') expect(result.reasonCodes).toContain('identity_unresolved')
    }
  })

  it('is deterministic and does not mutate the reviewed input', () => {
    const source = input()
    Object.freeze(source.formatEvidence[0])
    Object.freeze(source.formatEvidence)
    Object.freeze(source)
    expect(evaluateEditorialSelection(source)).toEqual(evaluateEditorialSelection(source))
    expect(source.identityStatus).toBe('grounded')
  })
})
