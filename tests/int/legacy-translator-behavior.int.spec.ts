import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMessage } = vi.hoisted(() => ({ createMessage: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class AnthropicMock {
    messages = { create: createMessage }
  },
}))

import { traduceArticol } from '../../translator'

const source = {
  titlu: 'Titlu românesc',
  excerpt: 'Rezumat în română',
  continut: { root: { children: [
    { type: 'paragraph', children: [{ type: 'text', text: 'Paragraf sursă' }] },
    { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Subtitlu sursă' }] },
  ] } },
}
const complete = `###TITLU###
English title
###EXCERPT###
English abstract
###CONTINUT###
[0|P] Translated paragraph
[1|H] Translated heading
###METATITLE###
English title
###METADESC###
English description
###END###`

function response(text: string, stop_reason = 'end_turn') {
  return { stop_reason, content: [{ type: 'text', text }] }
}

describe('Legacy RO→EN translation response validation (mocked provider)', () => {
  beforeEach(() => createMessage.mockReset())

  it('translates all text blocks in a complete response with one provider request', async () => {
    createMessage.mockResolvedValueOnce(response(complete))
    const result = await traduceArticol(source)
    expect(result?.titlu).toBe('English title')
    expect(result?.excerpt).toBe('English abstract')
    expect(result?.continut.root.children).toHaveLength(2)
    expect(createMessage).toHaveBeenCalledTimes(1)
  })

  it('retries exactly once after an incomplete answer, then succeeds', async () => {
    createMessage
      .mockResolvedValueOnce(response('###TITLU###\nEnglish title\n###EXCERPT###\nMissing content'))
      .mockResolvedValueOnce(response(complete))
    const result = await traduceArticol(source)
    expect(result?.titlu).toBe('English title')
    expect(createMessage).toHaveBeenCalledTimes(2)
  })

  it('rejects duplicate/missing block IDs rather than silently dropping content', async () => {
    const duplicate = complete.replace('[1|H] Translated heading', '[0|H] Duplicate index')
    createMessage.mockResolvedValue(response(duplicate))
    const result = await traduceArticol(source)
    expect(result).toBeNull()
    expect(createMessage).toHaveBeenCalledTimes(2)
  })

  it('rejects a missing excerpt', async () => {
    createMessage.mockResolvedValue(response(complete.replace('English abstract', '')))
    const result = await traduceArticol(source)
    expect(result).toBeNull()
    expect(createMessage).toHaveBeenCalledTimes(2)
  })

  it('retries a provider response ended by token limit', async () => {
    createMessage
      .mockResolvedValueOnce(response(complete, 'max_tokens'))
      .mockResolvedValueOnce(response(complete))
    const result = await traduceArticol(source)
    expect(result?.titlu).toBe('English title')
    expect(createMessage).toHaveBeenCalledTimes(2)
  })
  it('combines multiple provider text parts into a complete answer', async () => {
    const pivot = complete.indexOf('###CONTINUT###')
    createMessage.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: complete.slice(0, pivot) },
        { type: 'text', text: complete.slice(pivot) },
      ],
    })
    const result = await traduceArticol(source)
    expect(result?.continut.root.children).toHaveLength(2)
    expect(createMessage).toHaveBeenCalledTimes(1)
  })

  it('accepts complete body and END marker when optional SEO sections are omitted', async () => {
    const withoutSeo = complete.split('###METATITLE###')[0] + '###END###'
    createMessage.mockResolvedValueOnce(response(withoutSeo))
    const result = await traduceArticol(source)
    expect(result?.titlu).toBe('English title')
    expect(result?.metaTitle).toBe('English title')
    expect(result?.metaDescription).toBe('English abstract')
    expect(createMessage).toHaveBeenCalledTimes(1)
  })

  it('requires END marker and never accepts an unfinished answer', async () => {
    createMessage.mockResolvedValue(response(complete.replace('###END###', '')))
    await expect(traduceArticol(source)).resolves.toBeNull()
    expect(createMessage).toHaveBeenCalledTimes(2)
  })

  it('reports only safe categories and counts for malformed provider output', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const secretContent = 'SENSITIVE_EXCERPT_AND_PRIVATE_PROVIDER_OUTPUT'
      createMessage.mockResolvedValue(response(secretContent, 'max_tokens'))
      await expect(traduceArticol(source)).resolves.toBeNull()
      expect(createMessage).toHaveBeenCalledTimes(2)
      const logs = log.mock.calls.map((args) => args.join(' ')).join('\n')
      expect(logs).toContain('missing_sections_or_truncated_response')
      expect(logs).toContain('"stopReason":"max_tokens"')
      expect(logs).toContain('"attempt":2')
      expect(logs).not.toContain(secretContent)
      expect(logs).not.toContain(source.excerpt)
    } finally {
      log.mockRestore()
    }
  })

  it('handles an invalid provider response without leaking article data to logs', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      createMessage.mockResolvedValue({ stop_reason: 'end_turn', content: null })
      await expect(traduceArticol(source)).resolves.toBeNull()
      expect(createMessage).toHaveBeenCalledTimes(2)
      const logs = log.mock.calls.map((args) => args.join(' ')).join('\n')
      expect(logs).toContain('provider_or_runtime_error')
      expect(logs).toContain('"errorType":"TypeError"')
      expect(logs).not.toContain(source.excerpt)
      expect(logs).not.toContain(source.titlu)
    } finally {
      log.mockRestore()
    }
  })

})
