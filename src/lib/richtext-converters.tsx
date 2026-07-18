import type { DefaultNodeTypes, SerializedUploadNode, SerializedBlockNode } from '@payloadcms/richtext-lexical'
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

function videoEmbed(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return 'https://www.youtube.com/embed/' + yt[1]
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return 'https://player.vimeo.com/video/' + vm[1]
  return null
}

function VideoBlockRender({ node }: { node: SerializedBlockNode }) {
  const fields: any = node.fields || {}
  const embed = videoEmbed(fields.url || '')
  if (!embed) return null
  return (
    <div style={{ margin: '24px 0' }}>
      {fields.titlu && <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{fields.titlu}</h3>}
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 10 }}>
        <iframe src={embed} referrerPolicy="strict-origin-when-cross-origin" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={fields.titlu || 'Video'} />
      </div>
    </div>
  )
}

const CALLOUT_STIL: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: '#EEF4FB', border: '#C9DDF2', text: '#1a4a7a', icon: 'ℹ️' },
  sursa: { bg: '#F6F6F4', border: '#e0e0dc', text: '#444', icon: '📎' },
  producator: { bg: '#EEF4FB', border: '#C9DDF2', text: '#1a4a7a', icon: '🏭' },
  atentionare: { bg: '#FCF3E8', border: '#E8C99B', text: '#7A5A1E', icon: '⚠️' },
}

function CalloutBlockRender({ node }: { node: SerializedBlockNode }) {
  const fields: any = node.fields || {}
  const stil = CALLOUT_STIL[fields.tip] || CALLOUT_STIL.info
  return (
    <div style={{ margin: '24px 0', padding: '14px 18px', background: stil.bg, border: '1px solid ' + stil.border, borderRadius: 10, color: stil.text, fontSize: 14, lineHeight: 1.5 }}>
      <span>{stil.icon} {fields.text}</span>
      {fields.linkUrl && (
        <div style={{ marginTop: 8 }}>
          <a href={fields.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}>
            {fields.linkText || fields.linkUrl} →
          </a>
        </div>
      )}
    </div>
  )
}

function TableBlockRender({ node }: { node: SerializedBlockNode }) {
  const fields: any = node.fields || {}
  const headere = Array.isArray(fields.headere) ? fields.headere : []
  const randuri = Array.isArray(fields.randuri) ? fields.randuri : []
  return (
    <div style={{ margin: '24px 0', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        {headere.length > 0 && (
          <thead>
            <tr>
              {headere.map((h: any, i: number) => (
                <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #185FA5', fontWeight: 700 }}>{h.text}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {randuri.map((r: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
              {(Array.isArray(r.celule) ? r.celule : []).map((c: any, j: number) => (
                <td key={j} style={{ padding: '8px 12px' }}>{c.text}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const jsxConvertersCuImagini: JSXConvertersFunction<DefaultNodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }: any) => <ImagineCuAliniere node={node} />,
  blocks: {
    video: ({ node }: any) => <VideoBlockRender node={node} />,
    callout: ({ node }: any) => <CalloutBlockRender node={node} />,
    tableBlock: ({ node }: any) => <TableBlockRender node={node} />,
  },
})
