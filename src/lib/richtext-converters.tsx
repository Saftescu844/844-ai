import ExternalVideo from '@/components/ExternalVideo'
import type { DefaultNodeTypes, SerializedUploadNode, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import { richTextTextState } from '@/lib/richtext-text-state'


const NODE_STATE_KEY = '$'

function hyphenToCamel(value: string): string {
  return value.replace(
    /-([a-z])/g,
    (_, letter: string) => letter.toUpperCase(),
  )
}

function ImagineCuAliniere({ node }: { node: SerializedUploadNode }) {
  const doc: any = node.value
  if (!doc || typeof doc !== 'object' || !doc.url) return null
  const fields: any = node.fields || {}
  const align = fields.align || 'center'
  const caption = fields.caption || ''
  const credit = fields.credit || doc.credit || ''
  const width = fields.size === 'small' ? '50%' : fields.size === 'medium' ? '75%' : '100%'
  const floating = align === 'left' || align === 'right'

  return (
    <figure className="article-inline-image" style={{
      width, maxWidth: floating ? 320 : 650,
      float: floating ? align : undefined,
      margin: align === 'left' ? '4px 20px 12px 0' : align === 'right' ? '4px 0 12px 20px' : '24px auto',
    }}>
      <img src={doc.url} alt={fields.alt || doc.alt || caption || ''} style={{ display: 'block', width: '100%', maxWidth: '100%', height: 'auto', borderRadius: 10 }} />
      {(caption || credit) && <figcaption style={{ fontSize: 13, color: '#666', marginTop: 6, textAlign: 'center' }}>
        {caption && <span>{caption}</span>}
        {credit && <span style={{ display: 'block' }}>Credit: {credit}</span>}
      </figcaption>}
    </figure>
  )
}

function VideoBlockRender({ node }: { node: SerializedBlockNode }) {
  const fields: any = node.fields || {}
  return (
    <div style={{ margin: '24px 0' }}>
      {fields.titlu && <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{fields.titlu}</h3>}
      <ExternalVideo url={fields.url || ''} title={fields.titlu || 'Video'} />
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
  text: (args: any) => {
    const rendered =
      typeof defaultConverters.text === 'function'
        ? defaultConverters.text(args)
        : args.node.text

    const nodeState = args.node?.[NODE_STATE_KEY] as
      | Record<string, string>
      | undefined

    if (!nodeState) return rendered

    const styles: Record<string, string> = {}

    for (const [stateKey, stateValue] of Object.entries(nodeState)) {
      const css = (richTextTextState as any)[stateKey]?.[stateValue]?.css

      if (!css) continue

      for (const [property, value] of Object.entries(css)) {
        styles[hyphenToCamel(property)] = String(value)
      }
    }

    return Object.keys(styles).length > 0
      ? <span style={styles as any}>{rendered}</span>
      : rendered
  },
  table: ({ node, nodesToJSX }: any) => {
    const widths = Array.isArray(node.colWidths)
      ? node.colWidths.map((width: unknown) => typeof width === 'number' && Number.isFinite(width) && width > 0 ? Math.min(1200, Math.max(40, width)) : undefined)
      : []
    return <div className="lexical-table-container" role="region" aria-label="Table" tabIndex={0}>
      <table className="lexical-table" style={{ borderCollapse: 'collapse' }}>
        {widths.length > 0 && <colgroup>{widths.map((width: number | undefined, i: number) => <col key={i} style={{ width }} />)}</colgroup>}
        <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
      </table>
    </div>
  },
  upload: ({ node }: any) => <ImagineCuAliniere node={node} />,
  blocks: {
    video: ({ node }: any) => <VideoBlockRender node={node} />,
    callout: ({ node }: any) => <CalloutBlockRender node={node} />,
    tableBlock: ({ node }: any) => <TableBlockRender node={node} />,
  },
})
