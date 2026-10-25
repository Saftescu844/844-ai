import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const form = vi.hoisted(() => ({
  value: '2026-08-12T00:00:00.000Z' as string | null,
  disabled: false,
  setValue: vi.fn(),
  options: null as null | {
    potentiallyStalePath?: string
    validate: (value: unknown, options: { required: boolean }) => unknown
  },
}))

vi.mock('@payloadcms/ui', () => ({
  useField: (options: unknown) => {
    form.options = options as NonNullable<typeof form.options>
    return { ...form, path: 'surseFlash.1.sourcePublishedAt', showError: false }
  },
  withCondition: (Component: unknown) => Component,
  FieldLabel: ({ label, htmlFor }: { label: string; htmlFor: string }) => <label htmlFor={htmlFor}>{label}</label>,
  FieldError: () => null,
  FieldDescription: () => null,
}))

import SourcePublicationDateField from '../../src/components/admin/SourcePublicationDateField'

const field = { name: 'sourcePublishedAt', type: 'date' as const, label: 'Source publication date', required: false }
const props = { field, path: 'surseFlash.0.sourcePublishedAt' }

let container: HTMLDivElement
let root: Root
function render(element: ReactNode) { act(() => { root.render(element) }) }
function input() { return container.querySelector('input')! }
function change(value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), value)
    input().dispatchEvent(new Event('input', { bubbles: true }))
    input().dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('Source publication Admin field', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    form.value = '2026-08-12T00:00:00.000Z'; form.disabled = false; form.setValue.mockReset()
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
  })
  afterEach(() => { act(() => root.unmount()); container.remove() })

  it('renders the stored day without rewriting a value or marking the form modified', () => {
    render(<SourcePublicationDateField {...props} />)
    expect(input().value).toBe('2026-08-12')
    expect(input().name).toBe('surseFlash.1.sourcePublishedAt')
    expect(container.querySelector('label')!.htmlFor).toBe(input().id)
    expect(form.options!.potentiallyStalePath).toBe(props.path)
    expect(form.setValue).not.toHaveBeenCalled()
  })

  it('sets UTC midnight only when the editor changes a day and supports clearing', () => {
    render(<SourcePublicationDateField {...props} />)
    change('2028-02-29')
    expect(form.setValue).toHaveBeenLastCalledWith('2028-02-29T00:00:00.000Z')
    change('')
    expect(form.setValue).toHaveBeenLastCalledWith(null)
  })

  it.each(['readOnly', 'disabled', 'adminReadOnly'])('preserves %s field restrictions', restriction => {
    form.disabled = restriction === 'disabled'
    render(<SourcePublicationDateField {...props} readOnly={restriction === 'readOnly'} field={{ ...field, admin: { readOnly: restriction === 'adminReadOnly' } }} />)
    expect(input().disabled).toBe(true)
    change('2026-08-13')
    expect(form.setValue).not.toHaveBeenCalled()
  })

  it('passes required validation through to Payload', () => {
    const validate = vi.fn(() => 'Required date')
    render(<SourcePublicationDateField {...props} field={{ ...field, required: true }} validate={validate} />)
    expect(form.options!.validate(null, { required: false })).toBe('Required date')
    expect(validate).toHaveBeenCalledWith(null, expect.objectContaining({ required: true }))
  })
})
