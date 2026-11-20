'use client'

import { useRef, useState } from 'react'
import { useConfig, useDocumentInfo, useForm, useFormFields, useFormModified, useFormProcessing } from '@payloadcms/ui'
import { reloadSavedArticle } from '@/lib/article-editor-navigation'
import { populateEditorPreview } from '@/lib/article-editor-preview'
import { EnglishRetranslationReview, type RetranslationReview } from './EnglishRetranslationReview'

export function PrepareEnglishButton() {
  const { id } = useDocumentInfo()
  return <EnglishArticleActions key={String(id ?? 'new')} />
}

function EnglishArticleActions() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const { setDisabled, setProcessing } = useForm()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const language = useFormFields(([fields]) => fields.limba?.value)
  const partner = useFormFields(([fields]) => {
    const value = fields.versiuneAlternativa?.value as number | { id: number } | null
    return value && typeof value === 'object' ? value.id : value
  })
  const stale = useFormFields(([fields]) => fields.necesitaRetraducere?.value === true)
  const [review, setReview] = useState<RetranslationReview | null>(null)
  const fingerprint = useFormFields(([fields]) => JSON.stringify(Object.entries(fields)
    .filter(([key]) => !['continutHashTradus', 'necesitaRetraducere'].includes(key))
    .map(([key, field]) => [key, field.value])))
  const [appliedRevision, setAppliedRevision] = useState<string | null>(null)
  const applied = appliedRevision === fingerprint && !modified
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState('')
  const [englishId, setEnglishId] = useState<number | null>(null)
  if (language !== 'ro') return null

  const prepare = async () => {
    if (inFlight.current || !id || modified || processing) return
    inFlight.current = true
    setBusy(true)
    setDisabled(true)
    setProcessing(true)
    let refreshing = false
    setError('')
    try {
      const response = await fetch(`${config.routes.api}/articole/${id}/prepare-english`, {
        method: 'POST', credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Traducerea nu a reușit.')
      setEnglishId(result.englishId)
      reloadSavedArticle()
      refreshing = true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verifică legătura și reîncarcă articolul.')
    } finally {
      if (!refreshing) {
        inFlight.current = false
        setBusy(false)
        setDisabled(false)
        setProcessing(false)
      }
    }
  }
  const prepareUpdate = async () => {
    if (inFlight.current || !id || modified || processing) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${config.routes.api}/articole/${id}/retranslate-english-preview`, {
        method: 'POST', credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Propunerea nu a putut fi pregătită.')
      const [currentPreview, proposalPreview] = await Promise.all([
        populateEditorPreview(result.current.continut, config.routes.api),
        populateEditorPreview(result.proposal.continut, config.routes.api),
      ])
      setReview({ ...result, currentPreview, proposalPreview })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verifică legătura și reîncarcă articolul.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  const applyUpdate = async () => {
    if (inFlight.current || !review || modified || processing) return
    inFlight.current = true
    setBusy(true)
    setDisabled(true)
    setProcessing(true)
    let refreshing = false
    setError('')
    try {
      const response = await fetch(`${config.routes.api}/articole/${id}/retranslate-english-apply`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: review.token, proposal: review.proposal }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Traducerea nu a putut fi aplicată.')
      setEnglishId(result.englishId)
      setAppliedRevision(fingerprint)
      setReview(null)
      reloadSavedArticle()
      refreshing = true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Reîncarcă articolele pentru a verifica rezultatul salvării.')
    } finally {
      if (!refreshing) {
        inFlight.current = false
        setBusy(false)
        setDisabled(false)
        setProcessing(false)
      }
    }
  }
  const target = partner || englishId
  const disabled = !id || modified || processing || busy
  return <div className="article-english-controls">
    <p>Salvează versiunea RO, apoi pregătește traducerea. Draftul EN păstrează structura articolului și necesită revizuire înainte de publicare.</p>
    {target ? <>
      <a href={`${config.routes.admin}/collections/articole/${target}`}>Deschide versiunea EN #{target}</a>
      {stale && !applied && <p role="status">Versiunea RO s-a modificat după ultima traducere. Verifică și actualizează EN.</p>}
      <p>Poți pregăti o traducere nouă pentru comparație. Versiunea EN existentă se schimbă doar după ce aplici propunerea.</p>
      <button type="button" disabled={disabled} onClick={prepareUpdate}>
        {busy && !review ? 'Se pregătește propunerea…' : 'Pregătește actualizarea EN'}
      </button>
    </> : <button type="button" disabled={disabled} onClick={prepare}>
      {busy ? 'Se pregătește traducerea…' : 'Pregătește versiunea EN'}
    </button>}
    {(!id || modified) && <p>Salvează articolul pentru a activa traducerea.</p>}
    {applied ? <p role="status">Traducerea a fost aplicată în draftul EN și trimisă în revizuire. Deschide versiunea EN pentru verificarea finală.</p>
      : englishId && <p role="status">Versiunea EN a fost pregătită. Reîncarcă articolul RO pentru a vedea asocierea actualizată.</p>}
    {error && !review && <p role="alert">{error}</p>}
    {review && <EnglishRetranslationReview review={review} busy={busy} disabled={modified || processing}
      error={error} adminURL={config.routes.admin} onApply={applyUpdate}
      onDiscard={() => { setReview(null); setError('') }} />}
  </div>
}
