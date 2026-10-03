'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { externalVideoSource, type ExternalVideoSource } from '@/lib/external-video'

const buttonStyle = {
  padding: '9px 14px',
  border: '1px solid #185FA5',
  borderRadius: 6,
  background: '#fff',
  color: '#185FA5',
  font: 'inherit',
  cursor: 'pointer',
}

function VideoConsent({
  source,
  title,
  lang,
}: {
  source: ExternalVideoSource
  title?: string
  lang: string
}) {
  const [choice, setChoice] = useState<'pending' | 'accepted' | 'declined'>('pending')
  const actionRef = useRef<HTMLButtonElement>(null)
  const ro = lang !== 'en'
  const allowed = choice === 'accepted'

  function choose(next: typeof choice) {
    setChoice(next)
    // The same control remains mounted, keeping keyboard focus after withdrawal.
    actionRef.current?.focus()
  }

  return (
    <section
      aria-label={title || (ro ? 'Videoclip extern' : 'External video')}
      style={{
        margin: '16px 0',
        border: '1px solid #d5dfeb',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {allowed && (
        <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000' }}>
          <iframe
            src={source.embedUrl}
            title={title || `${source.provider} video`}
            referrerPolicy="no-referrer"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      )}
      <div
        style={{ padding: 18, background: '#F5F8FC', color: '#333', fontSize: 15, lineHeight: 1.6 }}
      >
        <p style={{ margin: '0 0 12px' }}>
          {ro
            ? `Dacă accepți, ${source.provider} va primi adresa IP și informații despre browser și poate utiliza cookie-uri sau alte tehnologii, inclusiv pentru analiză ori publicitate, potrivit propriei politici. Acordul se aplică doar acestui videoclip cât timp este afișat aici.`
            : `If you accept, ${source.provider} will receive your IP address and browser information and may use cookies or other technologies, including for analytics or advertising, under its own policy. Consent applies only to this video while it is displayed here.`}{' '}
          <a href={source.policyUrl} target="_blank" rel="noopener noreferrer">
            {ro ? `Politica ${source.provider}` : `${source.provider} policy`}
          </a>
          {' · '}
          <a href={`/${ro ? 'ro' : 'en'}/politica-cookie-uri`}>
            {ro ? 'Politica de cookie-uri' : 'Cookie Policy'}
          </a>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            ref={actionRef}
            style={buttonStyle}
            onClick={() => choose(allowed ? 'pending' : 'accepted')}
          >
            {allowed
              ? ro
                ? 'Retrag acordul și opresc videoclipul'
                : 'Withdraw consent and stop video'
              : ro
                ? 'Accept și încarc videoclipul'
                : 'Accept and load video'}
          </button>
          {!allowed && (
            <button type="button" style={buttonStyle} onClick={() => choose('declined')}>
              {ro ? 'Nu accept' : 'Decline'}
            </button>
          )}
        </div>
        <p role="status" style={{ margin: '10px 0 0', fontSize: 13 }}>
          {allowed
            ? ro
              ? 'Poți retrage acordul oricând. Cookie-urile deja create de furnizor se șterg din setările browserului.'
              : 'You can withdraw consent at any time. Cookies already set by the provider can be deleted in your browser settings.'
            : choice === 'declined'
              ? ro
                ? 'Ai refuzat. Videoclipul rămâne blocat; poți citi în continuare pagina.'
                : 'You declined. The video remains blocked; you can continue reading.'
              : ro
                ? 'Videoclip blocat. Furnizorul nu este contactat de acest player înainte de acord.'
                : 'Video blocked. This player does not contact the provider before consent.'}
        </p>
      </div>
    </section>
  )
}

export default function ExternalVideo({
  url,
  title,
  lang,
}: {
  url: string
  title?: string
  lang?: string
}) {
  const pathname = usePathname()
  const language = lang || (pathname?.split('/')[1] === 'en' ? 'en' : 'ro')
  const source = externalVideoSource(url)
  if (!source)
    return (
      <p>
        {language === 'en' ? 'This video is unavailable.' : 'Acest videoclip nu este disponibil.'}
      </p>
    )
  // A different video must never inherit a previous video's consent.
  return <VideoConsent key={source.embedUrl} source={source} title={title} lang={language} />
}
