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
})
