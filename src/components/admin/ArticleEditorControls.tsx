'use client'

import { useEffect, useRef, useState } from 'react'
import { useConfig, useFormFields } from '@payloadcms/ui'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { jsxConvertersCuImagini } from '@/lib/richtext-converters'
import '@/styles/article-content.css'
import { populateEditorPreview } from '@/lib/article-editor-preview'

export function ArticleEditorControls() {
  const { config } = useConfig()
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const controls = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [mobile, setMobile] = useState(false)
  const content = useFormFields(([fields]) => fields.continut?.value)
  const title = useFormFields(([fields]) => fields.titlu?.value as string)

  useEffect(() => {
    const field = controls.current?.closest('.rich-text-lexical')
    field?.classList.toggle('article-editor-expanded', expanded)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', escape)
    return () => {
      field?.classList.remove('article-editor-expanded')
      window.removeEventListener('keydown', escape)
    }
  }, [expanded])

  const openPreview = async () => {
    setLoading(true)
    setError('')
    try {
      setPreview(await populateEditorPreview(content, config.routes.api))
      dialog.current?.showModal()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Previzualizarea nu este disponibilă.')
    } finally {
      setLoading(false)
    }
  }

  return <div ref={controls} className="article-editor-controls">
    <button type="button" aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Restrânge editorul' : 'Extinde editorul'}
    </button>
    <button type="button" disabled={!content || loading} onClick={openPreview}>
      {loading ? 'Se încarcă…' : 'Previzualizează conținutul'}
    </button>
    {error && <p role="alert">{error}</p>}
    <dialog ref={dialog} className="article-editor-preview">
      <div className="article-editor-controls">
        <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button>
        <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobil</button>
        <button type="button" onClick={() => dialog.current?.close()}>Închide</button>
      </div>
      <p>Previzualizare a conținutului nesalvat. Pentru pagina completă, salvează și folosește Preview.</p>
      <article className={mobile ? 'article-preview-mobile' : ''} style={{ maxWidth: mobile ? 390 : 720, margin: 'auto', fontSize: 17 }}>
        <h1>{title}</h1>
        {!!preview && <RichText className="article-content" data={preview} converters={jsxConvertersCuImagini} />}
      </article>
    </dialog>
  </div>
}
