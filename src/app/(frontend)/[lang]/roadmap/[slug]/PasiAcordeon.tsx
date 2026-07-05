'use client'
import { useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'

export default function PasiAcordeon({ pasi }: { pasi: any[] }) {
  const [deschis, setDeschis] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pasi.map((pas: any, i: number) => {
        const activ = deschis === i
        return (
          <div key={i} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setDeschis(activ ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 18px', background: activ ? '#F5F8FC' : '#fff', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 600, textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#185FA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{pas.titlu}</span>
              <span style={{ fontSize: 14, color: '#185FA5' }}>{activ ? '▲' : '▼'}</span>
            </button>
            {activ && (
              <div style={{ padding: '0 18px 18px 54px' }}>
                {pas.descriere && (
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333', marginBottom: 10 }}>
                    <RichText data={pas.descriere as any} />
                  </div>
                )}
                {Array.isArray(pas.resurse) && pas.resurse.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {pas.resurse.map((res: any, j: number) => (
                      <a key={j} href={res.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#185FA5', textDecoration: 'none' }}>
                        📎 {res.titlu || res.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
