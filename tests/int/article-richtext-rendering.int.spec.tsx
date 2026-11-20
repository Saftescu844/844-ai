import { renderToStaticMarkup } from 'react-dom/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { describe, expect, it, vi } from 'vitest'
import { jsxConvertersCuImagini } from '../../src/lib/richtext-converters'
import { populateEditorPreview } from '../../src/lib/article-editor-preview'

const text = (value: string, props = {}) => ({ type: 'text', text: value, format: 0, version: 1, ...props })
const paragraph = (value: string) => ({ type: 'paragraph', format: '', indent: 0, version: 1, children: [text(value)] })
const root = (children: any[]) => ({ root: { type: 'root', format: '', indent: 0, version: 1, children } })

describe('Article layout and preview', () => {
  it('renders native tables with widths, merged headers and inline styles alongside legacy tables', () => {
    const markup = renderToStaticMarkup(<RichText data={root([
      { type: 'table', version: 1, colWidths: [180, 260], children: [{ type: 'tablerow', version: 1, children: [
        { type: 'tablecell', version: 1, headerState: 1, colSpan: 2, rowSpan: 1, children: [paragraph('Header')] },
      ] }] },
      { type: 'block', version: 2, fields: { blockType: 'tableBlock', headere: [{ text: 'Old header' }], randuri: [{ celule: [{ text: 'Old cell' }] }] } },
      { ...paragraph('Formatted'), children: [text('Formatted', { format: 1, $: { highlight: 'yellow', fontSize: 'large', color: 'red', invalid: 'url(javascript:bad)' } })] },
    ]) as any} converters={jsxConvertersCuImagini} />)
    const doc = new DOMParser().parseFromString(markup, 'text/html')
    expect(doc.querySelectorAll('table')).toHaveLength(2)
    expect(doc.querySelector('th')?.colSpan).toBe(2)
    expect(doc.querySelector('col')?.style.width).toBe('180px')
    expect(doc.querySelector('[role="region"]')?.getAttribute('tabindex')).toBe('0')
    expect(markup).toContain('Old cell')
    expect(markup).toContain('background-color:#FFF0A6')
    expect(markup).not.toContain('javascript:bad')
  })

  it('renders responsive images with explicit alt text and credit, preserving old uploads', () => {
    const markup = renderToStaticMarkup(<RichText data={root([
      { type: 'upload', version: 3, relationTo: 'media', value: { id: 1, url: '/example.jpg', alt: 'Default alt' }, fields: { alt: 'English alt', size: 'small', caption: 'Caption', credit: 'Author' } },
      { type: 'upload', version: 3, relationTo: 'media', value: { id: 2, url: '/old.jpg', alt: 'Old alt' } },
    ]) as any} converters={jsxConvertersCuImagini} />)
    const doc = new DOMParser().parseFromString(markup, 'text/html')
    expect(doc.querySelector('img')?.getAttribute('alt')).toBe('English alt')
    expect(doc.querySelector('figure')?.style.width).toBe('50%')
    expect(markup).toContain('Credit: Author')
    expect(markup).toContain('Old alt')
    expect(doc.querySelector('img')?.style.maxWidth).toBe('100%')
  })

  it('populates unpopulated image IDs for preview without changing the unsaved form', async () => {
    const content = root([{ type: 'upload', relationTo: 'media', value: 2, fields: { caption: 'Unsaved caption' } }])
    const fetchMedia = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [{ id: 2, url: '/two.png' }] }) })
    const preview = await populateEditorPreview(content, '/api', fetchMedia)
    expect(preview.root.children[0].value.url).toBe('/two.png')
    expect(preview.root.children[0].fields.caption).toBe('Unsaved caption')
    expect(content.root.children[0].value).toBe(2)
    expect(fetchMedia).toHaveBeenCalledOnce()
  })

  it('reports missing media instead of silently hiding images in preview', async () => {
    const fetchMedia = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ docs: [] }) })
    await expect(populateEditorPreview(root([{ type: 'upload', relationTo: 'media', value: 99 }]), '/api', fetchMedia)).rejects.toThrow('lipsește')
  })
})
