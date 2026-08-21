'use client'

import { useState } from 'react'
import type { SiteSetting } from '@/payload-types'

type NewsletterSettings = NonNullable<SiteSetting['newsletter']>

function textOrFallback(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback
}

export default function NewsletterForm({
  lang,
  settings,
}: {
  lang: string
  settings?: NewsletterSettings | null
}) {
  const [email, setEmail] = useState('')
  const [consimtamant, setConsimtamant] = useState(false)
  const [stare, setStare] = useState<'idle' | 'trimit' | 'succes' | 'eroare' | 'exista'>('idle')

  const fallback =
    lang === 'ro'
      ? {
          titlu: 'Abonează-te la newsletter',
          desc: 'Primești o dată pe săptămână cele mai importante noutăți AI, direct pe email.',
          emailLabel: 'Adresa de email',
          placeholder: 'adresa@email.ro',
          buton: 'Abonează-te',
          succes: '✓ Ți-am trimis un email. Confirmă abonarea folosind linkul primit.',
          eroare: 'A apărut o eroare. Încearcă din nou.',
          exista: 'Această adresă e deja abonată.',
          consimt:
            'Sunt de acord ca adresa mea de email să fie folosită pentru trimiterea newsletter-ului, conform',
          privacyLabel: 'Politicii de Confidențialitate',
          privacyHref: '/ro/politica-confidentialitate',
        }
      : {
          titlu: 'Subscribe to our newsletter',
          desc: 'Get the most important AI news once a week, straight to your inbox.',
          emailLabel: 'Email address',
          placeholder: 'your@email.com',
          buton: 'Subscribe',
          succes:
            "✓ We've sent you an email. Confirm your subscription using the link in the email.",
          eroare: 'Something went wrong. Please try again.',
          exista: 'This email is already subscribed.',
          consimt:
            'I agree to have my email address used to send the newsletter, in accordance with the',
          privacyLabel: 'Privacy Policy',
          privacyHref: '/en/politica-confidentialitate',
        }

  const txt = {
    titlu: textOrFallback(settings?.title, fallback.titlu),
    desc: textOrFallback(settings?.description, fallback.desc),
    emailLabel: textOrFallback(settings?.emailLabel, fallback.emailLabel),
    placeholder: textOrFallback(settings?.emailPlaceholder, fallback.placeholder),
    buton: textOrFallback(settings?.submitLabel, fallback.buton),
    succes: textOrFallback(settings?.successMessage, fallback.succes),
    eroare: textOrFallback(settings?.genericErrorMessage, fallback.eroare),
    exista: textOrFallback(settings?.alreadySubscribedMessage, fallback.exista),
    consimt: textOrFallback(settings?.consentText, fallback.consimt),
    privacyLabel: textOrFallback(settings?.privacyLabel, fallback.privacyLabel),
    privacyHref: textOrFallback(settings?.privacyHref, fallback.privacyHref),
  }

  async function trimite(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    if (!consimtamant) return
    setStare('trimit')
    try {
      const resp = await fetch('/api-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, limba: lang }),
      })
      if (resp.ok) {
        setStare('succes')
        setEmail('')
      } else if (resp.status === 409) {
        setStare('exista')
      } else {
        setStare('eroare')
      }
    } catch {
      setStare('eroare')
    }
  }

  if (stare === 'succes') {
    return <p style={{ fontSize: 14, color: '#0F6E56', fontWeight: 500 }}>{txt.succes}</p>
  }

  return (
    <div style={{ padding: '18px 20px', background: '#F6F6F4', borderRadius: 10 }}>
      <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{txt.titlu}</p>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>{txt.desc}</p>
      <form onSubmit={trimite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={txt.emailLabel}
          placeholder={txt.placeholder}
          required
          style={{
            flex: 1,
            minWidth: 180,
            padding: '9px 12px',
            border: '1px solid #d4d4d4',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={stare === 'trimit' || !consimtamant}
          style={{
            padding: '9px 18px',
            background: '#185FA5',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: consimtamant ? 'pointer' : 'not-allowed',
            opacity: stare === 'trimit' || !consimtamant ? 0.6 : 1,
          }}
        >
          {stare === 'trimit' ? '...' : txt.buton}
        </button>
      </form>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 7,
          marginTop: 10,
          fontSize: 12,
          color: '#555',
          lineHeight: 1.4,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={consimtamant}
          onChange={(e) => setConsimtamant(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <span>
          {txt.consimt}{' '}
          <a
            href={txt.privacyHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#185FA5', textDecoration: 'underline' }}
          >
            {txt.privacyLabel}
          </a>
          .
        </span>
      </label>
      {stare === 'eroare' && (
        <p style={{ fontSize: 13, color: '#c0392b', marginTop: 8 }}>{txt.eroare}</p>
      )}
      {stare === 'exista' && (
        <p style={{ fontSize: 13, color: '#B8860B', marginTop: 8 }}>{txt.exista}</p>
      )}
    </div>
  )
}
