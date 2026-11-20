import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ modified: false, processing: false, fields: {} as Record<string, { value: unknown }> }))
vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { api: '/api', admin: '/admin' } } }),
  useDocumentInfo: () => ({ id: 16 }),
  useFormModified: () => state.modified,
  useFormProcessing: () => state.processing,
  useFormFields: (selector: (context: unknown[]) => unknown) => selector([state.fields]),
}))
import { PrepareEnglishButton } from '../../src/components/admin/PrepareEnglishButton'

const content = { root: { type: 'root', format: '', indent: 0, version: 1, children: [
  { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text: 'Formatted article', format: 1, version: 1 }] },
] } }
const proposal = { titlu: 'Proposed English', excerpt: 'Proposed summary', continut: content, metaTitle: 'SEO', metaDescription: 'Description' }
const review = { englishId: 17, token: 'signed-proposal', expires: Date.now() + 600_000,
  current: { ...proposal, titlu: 'Manually corrected English' }, proposal }
let root: Root
let container: HTMLDivElement
const button = (name: string) => {
  const found = [...container.querySelectorAll('button')].find(button => button.textContent === name)
  if (!found) throw new Error(`Missing button: ${name}`)
  return found
}
const render = () => act(async () => root.render(<PrepareEnglishButton />))
const click = (name: string) => act(async () => { button(name).click() })

describe('Retranslation review controls', () => {
  const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
  beforeAll(() => Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  }))
  afterAll(() => {
    if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  })
  beforeEach(() => {
    state.modified = false
    state.processing = false
    state.fields = { limba: { value: 'ro' }, versiuneAlternativa: { value: 17 }, necesitaRetraducere: { value: true }, titlu: { value: 'RO article' } }
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => review }))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('offers an update alongside the existing EN link and never applies it just by previewing', async () => {
    await render()
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/admin/collections/articole/17')
    expect(container.textContent).toContain('Versiunea RO s-a modificat')
    await click('Pregătește actualizarea EN')
    expect(container.querySelector('dialog')?.open).toBe(true)
    expect(container.textContent).toContain('Manually corrected English')
    expect(container.textContent).toContain('Proposed English')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/articole/16/retranslate-english-preview', expect.anything())
    await click('Renunță la propunere')
    expect(container.querySelector('dialog')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('applies the raw signed proposal only after the explicit apply button', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => review } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ englishId: 17, applied: true }) } as Response)
    await render()
    await click('Pregătește actualizarea EN')
    await click('Aplică traducerea în draftul EN')
    expect(container.querySelector('dialog')).toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/articole/16/retranslate-english-apply', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ token: review.token, proposal }),
    }))
    expect(container.textContent).toContain('Traducerea a fost aplicată')
  })

  it('disables updating while the RO form contains unsaved edits', async () => {
    state.modified = true
    await render()
    expect(button('Pregătește actualizarea EN').disabled).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('retains the proposal and shows the conflict when EN changed before applying', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => review } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'EN s-a schimbat. Corecturile au fost păstrate.' }) } as Response)
    await render()
    await click('Pregătește actualizarea EN')
    await click('Aplică traducerea în draftul EN')
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('EN s-a schimbat. Corecturile au fost păstrate.')
    expect(container.querySelector('dialog')?.open).toBe(true)
  })
})
