'use client'

import { useEffect, useRef } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { jsxConvertersCuImagini } from '@/lib/richtext-converters'
import '@/styles/article-content.css'
import type { TraducereRezultat } from '../../../translator'

export type RetranslationReview = {
  englishId: number; current: TraducereRezultat; proposal: TraducereRezultat
  token: string; expires: number; currentPreview: any; proposalPreview: any
}

function OtherTexts({ article }: { article: TraducereRezultat }) {
  return <details>
    <summary>SEO, galerie, video și etichete</summary>
    <p><strong>Titlu SEO</strong> {article.metaTitle || '—'}</p>
    <p><strong>Descriere SEO</strong> {article.metaDescription || '—'}</p>
    <p><strong>Titlu video</strong> {article.videoTitlu || '—'}</p>
    <p><strong>Etichete</strong> {article.tags?.map(tag => tag.tag).join(', ') || '—'}</p>
    {article.galerie?.map((image, index) => <p key={index}>Imagine {index + 1}: {image.caption || '—'} · Credit: {image.credit || '—'}</p>)}
  </details>
}

export function EnglishRetranslationReview({ review, busy, disabled, error, adminURL, onApply, onDiscard }: {
  review: RetranslationReview; busy: boolean; disabled: boolean; error: string; adminURL: string
  onApply: () => void; onDiscard: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="article-retranslation-review" aria-labelledby="english-review-title"
    onCancel={event => { event.preventDefault(); if (!busy) onDiscard() }}>
    <h2 id="english-review-title">Revizuiește actualizarea EN #{review.englishId}</h2>
    <p>Compară cele două texte. Aplicarea înlocuiește textele din draftul EN, inclusiv eventualele corecturi manuale. Versiunea anterioară rămâne în istoricul articolului. Verificările editoriale și medicale ale draftului trebuie refăcute. Pagina publicată rămâne la versiunea curentă până la o publicare separată.</p>
    <p><a href={`${adminURL}/collections/articole/${review.englishId}/versions`} target="_blank" rel="noreferrer">Istoricul versiunii EN</a> · Propunerea este valabilă 10 minute.</p>
    <div className="article-retranslation-review__columns">
      <section aria-label="Versiunea EN existentă">
        <h3>EN existentă</h3><h4>{review.current.titlu}</h4><p>{review.current.excerpt}</p>
        <RichText className="article-content" data={review.currentPreview} converters={jsxConvertersCuImagini} />
        <OtherTexts article={review.current} />
      </section>
      <section aria-label="Traducerea EN propusă">
        <h3>Traducerea propusă</h3><h4>{review.proposal.titlu}</h4><p>{review.proposal.excerpt}</p>
        <RichText className="article-content" data={review.proposalPreview} converters={jsxConvertersCuImagini} />
        <OtherTexts article={review.proposal} />
      </section>
    </div>
    <div className="article-retranslation-review__actions">
      {error && <p role="alert">{error}</p>}
      {disabled && <p>Salvează modificările RO și pregătește o propunere nouă.</p>}
      <button type="button" disabled={busy} onClick={onDiscard}>Renunță la propunere</button>
      <button type="button" disabled={busy || disabled} onClick={onApply}>
        {busy ? 'Se salvează…' : 'Aplică traducerea în draftul EN'}
      </button>
    </div>
  </dialog>
}
