type Node = Record<string, any>
export type TranslationUnit = { tip: string; text: string; target: Node; key: string }

/** Clone first, then expose only editorial text. URLs, IDs, styles and media stay local. */
export function prepareLexicalTranslation(content: unknown, metadata?: { galerie?: any[] | null; videoTitlu?: string | null; tags?: any[] | null }) {
  const document = structuredClone(content) as Node
  if (!Array.isArray(document?.root?.children)) throw new Error('Invalid Lexical document')
  const units: TranslationUnit[] = []
  const add = (target: Node, key: string, heading = false) => {
    if (typeof target[key] === 'string' && target[key].trim()) {
      units.push({ tip: heading ? 'heading' : 'paragraph', text: target[key], target, key })
    }
  }
  const walk = (node: Node, heading = false) => {
    if (!node || typeof node !== 'object') throw new Error('Invalid Lexical node')
    if (node.type === 'text') add(node, 'text', heading)
    if (node.type === 'upload') {
      if (node.fields) {
        add(node.fields, 'caption')
        add(node.fields, 'alt')
      }
      // Populated media may contain alt text too. Translate a per-use override,
      // never mutate the shared media record or translate attribution/credit.
      if (!node.fields?.alt && typeof node.value === 'object' && node.value?.alt) {
        node.fields = { ...node.fields, alt: node.value.alt }
        add(node.fields, 'alt')
      }
    }
    if (node.type === 'block') {
      const fields = node.fields
      if (!fields || !['callout', 'video', 'tableBlock'].includes(fields.blockType)) {
        throw new Error('Unsupported editorial block for translation')
      }
      if (fields.blockType === 'callout') {
        add(fields, 'text')
        add(fields, 'linkText')
      } else if (fields.blockType === 'video') {
        add(fields, 'titlu')
      } else {
        for (const header of fields.headere || []) add(header, 'text')
        for (const row of fields.randuri || []) {
          for (const cell of row.celule || []) add(cell, 'text')
        }
      }
    }
    for (const child of node.children || []) walk(child, heading || node.type === 'heading')
  }
  walk(document.root)
  const translatedMetadata = structuredClone(metadata || {})
  for (const image of translatedMetadata.galerie || []) add(image, 'caption')
  for (const tag of translatedMetadata.tags || []) add(tag, 'tag')
  add(translatedMetadata, 'videoTitlu')
  return {
    metadata: translatedMetadata,
    units,
    apply(translations: Record<number, { text: string }>) {
      if (Object.keys(translations).length !== units.length) throw new Error('Incomplete translation')
      units.forEach((unit, i) => {
        if (!translations[i]?.text?.trim()) throw new Error('Missing translated text')
        unit.target[unit.key] = translations[i].text
      })
      return document
    },
  }
}
