import { describe, expect, it } from 'vitest'
import { prepareLexicalTranslation } from '../../src/lib/lexical-translation'
import { articleTranslationHash } from '../../src/lib/article-translation-hash'

const text = (value: string, props = {}) => ({ type: 'text', text: value, format: 0, version: 1, ...props })
const paragraph = (children: unknown[]) => ({ type: 'paragraph', children, version: 1 })

describe('Formatted article translation', () => {
  it('preserves inline styles, lists, links, table dimensions and media while translating every text field', () => {
    const source = { root: { type: 'root', children: [
      { type: 'heading', tag: 'h2', children: [text('Titlu', { format: 1, $: { fontSize: 'large' } })] },
      paragraph([text('Vezi '), { type: 'link', fields: { url: 'https://example.org/ro' }, children: [text('sursa')] }]),
      { type: 'list', listType: 'bullet', children: [{ type: 'listitem', value: 1, children: [text('Element')] }] },
      { type: 'table', colWidths: [180, 260], children: [{ type: 'tablerow', children: [
        { type: 'tablecell', headerState: 1, colSpan: 2, rowSpan: 1, backgroundColor: '#eee', children: [paragraph([text('Celulă')])] },
      ] }] },
      { type: 'upload', value: 7, relationTo: 'media', fields: { caption: 'Descriere', alt: 'Grafic', credit: 'Autor', align: 'left', size: 'small' } },
      { type: 'block', fields: { blockType: 'callout', id: 'callout-id', text: 'Notă', linkText: 'Detalii', linkUrl: 'https://example.org' } },
      { type: 'block', fields: { blockType: 'tableBlock', headere: [{ text: 'Cap', id: 'h' }], randuri: [{ celule: [{ text: 'Valoare', id: 'c' }] }] } },
      { type: 'block', fields: { blockType: 'video', titlu: 'Demonstrație', url: 'https://youtube.com/watch?v=abcdef12345' } },
    ] } }
    const before = structuredClone(source)
    const prepared = prepareLexicalTranslation(source)
    expect(prepared.units.map(unit => unit.text)).toEqual([
      'Titlu', 'Vezi ', 'sursa', 'Element', 'Celulă', 'Descriere', 'Grafic', 'Notă', 'Detalii', 'Cap', 'Valoare', 'Demonstrație',
    ])
    const translated = prepared.apply(Object.fromEntries(prepared.units.map((unit, i) => [i, { text: `EN ${unit.text}` }])))
    expect(source).toEqual(before)
    expect(translated.root.children[0]).toMatchObject({ tag: 'h2', children: [{ text: 'EN Titlu', format: 1, $: { fontSize: 'large' } }] })
    expect(translated.root.children[1].children[1].fields.url).toBe('https://example.org/ro')
    expect(translated.root.children[3]).toMatchObject({ colWidths: [180, 260], children: [{ children: [{ colSpan: 2, headerState: 1 }] }] })
    expect(translated.root.children[4]).toMatchObject({ value: 7, fields: { caption: 'EN Descriere', alt: 'EN Grafic', credit: 'Autor', align: 'left', size: 'small' } })
    expect(translated.root.children[6].fields.randuri[0].celule[0]).toEqual({ id: 'c', text: 'EN Valoare' })
  })

  it('translates gallery captions, tags and video titles without changing media credits', () => {
    const metadata = { galerie: [{ imagine: 4, caption: 'Grafic', credit: 'Autor' }], tags: [{ tag: 'Sănătate' }], videoTitlu: 'Demonstrație' }
    const prepared = prepareLexicalTranslation({ root: { children: [] } }, metadata)
    prepared.apply({ 0: { text: 'Chart' }, 1: { text: 'Health' }, 2: { text: 'Demo' } })
    expect(prepared.metadata).toEqual({ galerie: [{ imagine: 4, caption: 'Chart', credit: 'Autor' }], tags: [{ tag: 'Health' }], videoTitlu: 'Demo' })
    expect(metadata.videoTitlu).toBe('Demonstrație')
  })

  it('refuses an incomplete translation and unsupported custom blocks', () => {
    const prepared = prepareLexicalTranslation({ root: { children: [paragraph([text('Unu'), text('Doi')])] } })
    expect(() => prepared.apply({ 0: { text: 'One' } })).toThrow('Incomplete')
    expect(() => prepareLexicalTranslation({ root: { children: [{ type: 'block', fields: { blockType: 'unknown' } }] } })).toThrow('Unsupported')
  })

  it('detects edits to titles, captions and table cells without depending on updatedAt', () => {
    const original = { titlu: 'Titlu', excerpt: 'Rezumat', continut: { root: { children: [] } } }
    expect(articleTranslationHash(original)).toBe(articleTranslationHash({ ...original }))
    expect(articleTranslationHash(original)).not.toBe(articleTranslationHash({ ...original, titlu: 'Alt titlu' }))
    expect(articleTranslationHash(original)).not.toBe(articleTranslationHash({ ...original, continut: { fields: { caption: 'Altă descriere' } } }))
  })
})
