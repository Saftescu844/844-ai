'use client'

import {
  type FormEvent,
  useState,
} from 'react'

type Props = {
  lang: string
}

export default function PasswordRecoveryForm({
  lang,
}: Props) {
  const ro = lang !== 'en'
  const [email, setEmail] =
    useState('')
  const [busy, setBusy] =
    useState(false)
  const [sent, setSent] =
    useState(false)

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setBusy(true)

    try {
      await fetch(
        '/api/useri/forgot-password',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email:
              email
                .trim()
                .toLowerCase(),
          }),
        },
      )
    } catch {
      // Răspunsul public rămâne generic,
      // inclusiv la erori de transport.
    } finally {
      setBusy(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        style={{
          padding: '14px 16px',
          borderRadius: 8,
          background: '#EEF7F0',
          color: '#2F6B3B',
          lineHeight: 1.55,
        }}
      >
        {ro
          ? 'Dacă adresa este asociată unui cont, vei primi un email cu instrucțiuni pentru resetarea parolei.'
          : 'If the address is associated with an account, you will receive an email with password reset instructions.'}
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <label
        style={{
          display: 'block',
          marginBottom: 14,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 6,
            padding: 11,
            border:
              '1px solid #ccc',
            borderRadius: 8,
            font: 'inherit',
          }}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        style={{
          border: 0,
          borderRadius: 8,
          padding: '10px 16px',
          background: '#185FA5',
          color: '#fff',
          cursor:
            busy
              ? 'default'
              : 'pointer',
          fontWeight: 600,
          opacity: busy ? 0.65 : 1,
        }}
      >
        {busy
          ? ro
            ? 'Se trimite…'
            : 'Sending…'
          : ro
            ? 'Trimite linkul de resetare'
            : 'Send reset link'}
      </button>
    </form>
  )
}
