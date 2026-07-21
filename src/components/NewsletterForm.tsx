'use client'
import { useState } from 'react'

export default function NewsletterForm({ lang }: { lang: string }) {
  const [email, setEmail] = useState('')
  const [consimtamant, setConsimtamant] = useState(false)
  const [stare, setStare] = useState<'idle' | 'trimit' | 'succes' | 'eroare' | 'exista'>('idle')

  const txt =
    lang === 'ro'
      ? {
          titlu: 'Abonează-te la newsletter',
          desc: 'Primești o dată pe săptămână cele mai importante noutăți AI, direct pe email.',
          placeholder: 'adresa@email.ro',
          buton: 'Abonează-te',
          succes: '✓ Te-ai abonat cu succes! Mulțumim.',
          eroare: 'A apărut o eroare. Încearcă din nou.',
          exista: 'Această adresă e deja abonată.',
          consimt1:
            'Sunt de acord ca adresa mea de email să fie folosită pentru trimiterea newsletter-ului, conform ',
          consimt2: 'Politicii de Confidențialitate',
          consimtLipsa:
            'Trebuie să fii de acord cu Politica de Confidențialitate pentru a te abona.',
        }
      : {
          titlu: 'Subscribe to our newsletter',
          desc: 'Get the most important AI news once a week, straight to your inbox.',
          placeholder: 'your@email.com',
          buton: 'Subscribe',
          succes: '✓ You are subscribed! Thank you.',
          eroare: 'Something went wrong. Please try again.',
          exista: 'This email is already subscribed.',
          consimt1:
            'I agree to have my email address used to send the newsletter, in accordance with the ',
          consimt2: 'Privacy Policy',
          consimtLipsa: 'You must agree to the Privacy Policy to subscribe.',
        }

  async function trimite(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    if (!consimtamant) return
    setStare('trimit')
    try {
      const resp = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, limba: lang, segment: ['general'] }),
      })
      if (resp.status === 201 || resp.ok) {
        setStare('succes')
        setEmail('')
      } else if (resp.status === 400) {
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
          {txt.consimt1}
          <a
            href={`/${lang}/politica-confidentialitate`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#185FA5', textDecoration: 'underline' }}
          >
            {txt.consimt2}
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
