'use client'

import Link from 'next/link'
import {
  type FormEvent,
  useState,
} from 'react'

type Props = {
  lang: string
  token: string
}

export default function PasswordResetForm({
  lang,
  token,
}: Props) {
  const ro = lang !== 'en'
  const [password, setPassword] =
    useState('')
  const [confirm, setConfirm] =
    useState('')
  const [busy, setBusy] =
    useState(false)
  const [success, setSuccess] =
    useState(false)
  const [error, setError] =
    useState('')

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (
      password.length < 10 ||
      password.length > 128
    ) {
      setError(
        ro
          ? 'Parola trebuie să aibă între 10 și 128 de caractere.'
          : 'Password must be between 10 and 128 characters.',
      )
      return
    }

    if (password !== confirm) {
      setError(
        ro
          ? 'Parolele introduse nu coincid.'
          : 'The passwords do not match.',
      )
      return
    }

    if (!token) {
      setError(
        ro
          ? 'Linkul de resetare este invalid sau incomplet.'
          : 'The reset link is invalid or incomplete.',
      )
      return
    }

    setBusy(true)

    try {
      const resp = await fetch(
        '/api/useri/reset-password',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            token,
            password,
          }),
        },
      )

      if (!resp.ok) {
        throw new Error('reset')
      }

      setPassword('')
      setConfirm('')
      setSuccess(true)
    } catch {
      setError(
        ro
          ? 'Linkul este invalid, a expirat sau a fost deja folosit.'
          : 'The link is invalid, expired, or has already been used.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div>
        <div
          role="status"
          style={{
            marginBottom: 18,
            padding: '14px 16px',
            borderRadius: 8,
            background: '#EEF7F0',
            color: '#2F6B3B',
            lineHeight: 1.55,
          }}
        >
          {ro
            ? 'Parola a fost schimbată. Te poți autentifica folosind noua parolă.'
            : 'Your password has been changed. You can now sign in with the new password.'}
        </div>

        <Link
          href={`/${ro ? 'ro' : 'en'}`}
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            borderRadius: 8,
            background: '#185FA5',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {ro
            ? 'Înapoi la 844-ai.ro'
            : 'Back to 844-ai.ro'}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <label
        style={{
          display: 'block',
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {ro
          ? 'Parolă nouă'
          : 'New password'}
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value,
            )
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

      <label
        style={{
          display: 'block',
          marginBottom: 14,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {ro
          ? 'Confirmă parola nouă'
          : 'Confirm new password'}
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          value={confirm}
          onChange={(event) =>
            setConfirm(
              event.target.value,
            )
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
            ? 'Se salvează…'
            : 'Saving…'
          : ro
            ? 'Schimbă parola'
            : 'Change password'}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            margin:
              '12px 0 0',
            color: '#8A3A2A',
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}
    </form>
  )
}
