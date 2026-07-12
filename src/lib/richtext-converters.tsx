import type { DefaultNodeTypes, SerializedUploadNode } from '@payloadcms/richtext-lexical'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

function ImagineCuAliniere({ node }: { node: SerializedUploadNode }) {
  const doc: any = node.value
  if (!doc || typeof doc !== 'object' || !doc.url) return null
  const fields: any = node.fields || {}
  const align = fields.align || 'center'
  const caption = fields.caption || ''

  if (align === 'left' || align === 'right') {
    return (
      <figure style={{ float: align as any, margin: align === 'left' ? '4px 20px 12px 0' : '4px 0 12px 20px', maxWidth: 320 }}>
        <img src={doc.url} alt={caption || doc.alt || ''} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 10 }} />
        {caption && <figcaption style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{caption}</figcaption>}
      </figure>
    )
  }

  return (
    <figure style={{ display: 'table', margin: '24px auto', maxWidth: 650 }}>
      <img src={doc.url} alt={caption || doc.alt || ''} style={{ display: 'block', maxWidth: 650, width: 'auto', height: 'auto', borderRadius: 10 }} />
      {caption && <figcaption style={{ fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center' }}>{caption}</figcaption>}
    </figure>
  )
}

export const jsxConvertersCuImagini: JSXConvertersFunction<DefaultNodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => <ImagineCuAliniere node={node} />,
})
