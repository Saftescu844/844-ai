'use client'
import { useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { jsxConvertersCuImagini } from '@/lib/richtext-converters'

export default function LectiiAcordeon({ lectii, lang }: { lectii: any[]; lang: string }) {
  const [deschis, setDeschis] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lectii.map((lectie: any, i: number) => {
        const activ = deschis === i
        return (
          <div key={i} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setDeschis(activ ? null : i)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', background: activ ? '#F5F8FC' : '#fff', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 600, textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <span>{i + 1}. {lectie.titlu}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {lectie.durataMinute && <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{lectie.durataMinute} min</span>}
                <span style={{ fontSize: 14, color: '#185FA5' }}>{activ ? '▲' : '▼'}</span>
              </span>
            </button>
            {activ && (
              <div style={{ padding: '0 18px 18px' }}>
                {lectie.videoURL && (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, marginBottom: 12 }}>
                    <iframe src={lectie.videoURL} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen title={lectie.titlu} />
                  </div>
                )}
                {lectie.continut && (
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
                    <RichText data={lectie.continut as any} converters={jsxConvertersCuImagini} />
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
