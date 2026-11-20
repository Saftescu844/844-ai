'use client'

import { useRef, useState } from 'react'
import { useConfig, useDocumentInfo, useFormFields, useFormModified, useFormProcessing } from '@payloadcms/ui'

export function PrepareEnglishButton() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const language = useFormFields(([fields]) => fields.limba?.value)
  const partner = useFormFields(([fields]) => fields.versiuneAlternativa?.value as number | null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState('')
  const [englishId, setEnglishId] = useState<number | null>(null)
  if (language !== 'ro') return null

  const prepare = async () => {
    if (inFlight.current || !id || modified || processing) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${config.routes.api}/articole/${id}/prepare-english`, {
        method: 'POST', credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Traducerea nu a reușit.')
      setEnglishId(result.englishId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verifică legătura și reîncarcă articolul.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const target = partner || englishId
  return <div className="article-english-controls">
    <p>Salvează versiunea RO, apoi pregătește traducerea. Draftul EN păstrează structura articolului și necesită revizuire înainte de publicare.</p>
    {target ? <a href={`${config.routes.admin}/collections/articole/${target}`}>Deschide versiunea EN #{target}</a>
      : <button type="button" disabled={!id || modified || processing || busy} onClick={prepare}>
        {busy ? 'Se pregătește traducerea…' : 'Pregătește versiunea EN'}
      </button>}
    {(!id || modified) && <p>Salvează articolul pentru a activa traducerea.</p>}
    {englishId && <p role="status">Versiunea EN a fost pregătită. Reîncarcă articolul RO pentru a vedea asocierea actualizată.</p>}
    {error && <p role="alert">{error}</p>}
  </div>
}
