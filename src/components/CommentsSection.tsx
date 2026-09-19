'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

type TargetType = 'articol' | 'flash'

type PublicComment = {
  id: number | string
  continut: string
  createdAt: string
  raspunsLa: number | string | null
  autor: {
    nume: string
  }
}

type PublicUser = {
  id: number | string
  email?: string | null
  nume?: string | null
}

type CommentsSectionProps = {
  targetType: TargetType
  targetId: number | string
  lang: string
}

type AuthMode = 'login' | 'register'

function formatDate(
  value: string,
  lang: string,
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(
    lang === 'en' ? 'en-GB' : 'ro-RO',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

export default function CommentsSection({
  targetType,
  targetId,
  lang,
}: CommentsSectionProps) {
  const ro = lang !== 'en'

  const [comentarii, setComentarii] =
    useState<PublicComment[]>([])
  const [comentariiLoading, setComentariiLoading] =
    useState(true)
  const [comentariiError, setComentariiError] =
    useState(false)

  const [authChecked, setAuthChecked] =
    useState(false)
  const [user, setUser] =
    useState<PublicUser | null>(null)
  const [authMode, setAuthMode] =
    useState<AuthMode>('login')
  const [authBusy, setAuthBusy] =
    useState(false)
  const [authError, setAuthError] =
    useState('')
  const [registerSent, setRegisterSent] =
    useState(false)

  const [loginEmail, setLoginEmail] =
    useState('')
  const [loginPassword, setLoginPassword] =
    useState('')

  const [registerName, setRegisterName] =
    useState('')
  const [registerEmail, setRegisterEmail] =
    useState('')
  const [registerPassword, setRegisterPassword] =
    useState('')
  const [acceptPrivacy, setAcceptPrivacy] =
    useState(false)

  const [continut, setContinut] =
    useState('')
  const [replyTo, setReplyTo] =
    useState<number | string | null>(null)
  const [commentBusy, setCommentBusy] =
    useState(false)
  const [commentMessage, setCommentMessage] =
    useState('')
  const [commentError, setCommentError] =
    useState('')

  const loadComments = useCallback(async () => {
    setComentariiLoading(true)
    setComentariiError(false)

    try {
      const resp = await fetch(
        `/api-comments?tip=${encodeURIComponent(targetType)}&id=${encodeURIComponent(String(targetId))}`,
        {
          cache: 'no-store',
        },
      )

      if (!resp.ok) {
        throw new Error('comments')
      }

      const date: unknown = await resp.json()

      if (
        !date ||
        typeof date !== 'object' ||
        !Array.isArray(
          (date as { comentarii?: unknown }).comentarii,
        )
      ) {
        throw new Error('comments')
      }

      setComentarii(
        (date as { comentarii: PublicComment[] })
          .comentarii,
      )
    } catch {
      setComentariiError(true)
    } finally {
      setComentariiLoading(false)
    }
  }, [targetId, targetType])

  const loadMe = useCallback(async () => {
    try {
      const resp = await fetch('/api/useri/me', {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!resp.ok) {
        setUser(null)
        return
      }

      const date: unknown = await resp.json()

      if (
        date &&
        typeof date === 'object' &&
        (date as { user?: unknown }).user &&
        typeof (date as { user?: unknown }).user === 'object'
      ) {
        setUser(
          (date as { user: PublicUser }).user,
        )
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => {
    void loadComments()
    void loadMe()
  }, [loadComments, loadMe])

  const byParent = useMemo(() => {
    const map = new Map<string, PublicComment[]>()

    for (const comentariu of comentarii) {
      const key =
        comentariu.raspunsLa === null
          ? 'root'
          : String(comentariu.raspunsLa)

      const list = map.get(key) ?? []
      list.push(comentariu)
      map.set(key, list)
    }

    return map
  }, [comentarii])

  const commentById = useMemo(
    () =>
      new Map(
        comentarii.map((comentariu) => [
          String(comentariu.id),
          comentariu,
        ]),
      ),
    [comentarii],
  )

  async function login(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setRegisterSent(false)

    try {
      const resp = await fetch('/api/useri/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      })

      if (!resp.ok) {
        throw new Error('login')
      }

      const date: unknown = await resp.json()
      const authenticatedUser =
        date &&
        typeof date === 'object' &&
        (date as { user?: unknown }).user &&
        typeof (date as { user?: unknown }).user === 'object'
          ? (date as { user: PublicUser }).user
          : null

      setUser(authenticatedUser)
      setLoginPassword('')
      setAuthError('')

      if (!authenticatedUser) {
        await loadMe()
      }
    } catch {
      setAuthError(
        ro
          ? 'Autentificarea nu a reușit. Verifică datele și confirmarea adresei de email.'
          : 'Sign-in failed. Check your credentials and make sure your email address is confirmed.',
      )
    } finally {
      setAuthBusy(false)
    }
  }

  async function register(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setAuthError('')
    setRegisterSent(false)

    if (!acceptPrivacy) {
      setAuthError(
        ro
          ? 'Trebuie să accepți Politica de Confidențialitate pentru a crea contul.'
          : 'You must accept the Privacy Policy to create an account.',
      )
      return
    }

    setAuthBusy(true)

    try {
      const resp = await fetch(
        '/api-account/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: registerEmail,
            parola: registerPassword,
            nume: registerName,
            limba: ro ? 'ro' : 'en',
          }),
        },
      )

      if (!resp.ok) {
        const date: unknown = await resp.json()
        const camp =
          date &&
          typeof date === 'object'
            ? String(
                (date as { camp?: unknown }).camp ?? '',
              )
            : ''

        if (camp === 'parola') {
          throw new Error('password')
        }

        if (camp === 'nume') {
          throw new Error('name')
        }

        if (camp === 'email') {
          throw new Error('email')
        }

        throw new Error('register')
      }

      setRegisterSent(true)
      setRegisterPassword('')
    } catch (eroare) {
      const code =
        eroare instanceof Error
          ? eroare.message
          : ''

      setAuthError(
        code === 'password'
          ? ro
            ? 'Parola trebuie să aibă între 10 și 128 de caractere.'
            : 'Password must be between 10 and 128 characters.'
          : code === 'name'
            ? ro
              ? 'Numele trebuie să aibă între 2 și 80 de caractere.'
              : 'Name must be between 2 and 80 characters.'
            : code === 'email'
              ? ro
                ? 'Adresa de email nu este validă.'
                : 'The email address is not valid.'
              : ro
                ? 'Nu am putut procesa înregistrarea. Încearcă din nou.'
                : 'We could not process the registration. Please try again.',
      )
    } finally {
      setAuthBusy(false)
    }
  }

  async function logout() {
    setAuthBusy(true)

    try {
      await fetch('/api/useri/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUser(null)
      setReplyTo(null)
      setAuthBusy(false)
    }
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setCommentError('')
    setCommentMessage('')

    if (!user) {
      setAuthMode('login')
      setCommentError(
        ro
          ? 'Autentifică-te pentru a trimite un comentariu.'
          : 'Sign in to submit a comment.',
      )
      return
    }

    const text = continut.trim()

    if (!text || text.length > 2000) {
      setCommentError(
        ro
          ? 'Comentariul trebuie să conțină între 1 și 2000 de caractere.'
          : 'The comment must contain between 1 and 2000 characters.',
      )
      return
    }

    setCommentBusy(true)

    try {
      const body: Record<string, unknown> = {
        continut: text,
        [targetType === 'articol'
          ? 'articol'
          : 'flash']: targetId,
      }

      if (replyTo !== null) {
        body.raspunsLa = replyTo
      }

      const resp = await fetch('/api/comentarii', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (resp.status === 401 || resp.status === 403) {
        setUser(null)
        throw new Error('auth')
      }

      if (!resp.ok) {
        throw new Error('comment')
      }

      setContinut('')
      setReplyTo(null)
      setCommentMessage(
        ro
          ? 'Comentariul a fost trimis și va apărea după moderare.'
          : 'Your comment was submitted and will appear after moderation.',
      )
    } catch (eroare) {
      setCommentError(
        eroare instanceof Error &&
        eroare.message === 'auth'
          ? ro
            ? 'Sesiunea a expirat. Autentifică-te din nou.'
            : 'Your session expired. Please sign in again.'
          : ro
            ? 'Comentariul nu a putut fi trimis. Încearcă din nou.'
            : 'The comment could not be submitted. Please try again.',
      )
    } finally {
      setCommentBusy(false)
    }
  }

  function renderComment(
    comentariu: PublicComment,
    depth = 0,
    path = new Set<string>(),
  ): React.ReactNode {
    const id = String(comentariu.id)

    if (path.has(id)) {
      return null
    }

    const nextPath = new Set(path)
    nextPath.add(id)

    const children =
      byParent.get(id) ?? []

    return (
      <div
        key={id}
        style={{
          marginLeft: depth > 0 ? 22 : 0,
          paddingLeft: depth > 0 ? 14 : 0,
          borderLeft:
            depth > 0
              ? '2px solid #ececec'
              : undefined,
          marginTop: depth > 0 ? 14 : 0,
        }}
      >
        <div
          style={{
            padding: '14px 0',
            borderBottom:
              depth === 0
                ? '1px solid #ececec'
                : undefined,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
              flexWrap: 'wrap',
              marginBottom: 6,
            }}
          >
            <strong
              style={{
                fontSize: 14,
                color: '#222',
              }}
            >
              {comentariu.autor.nume}
            </strong>

            <span
              style={{
                fontSize: 12,
                color: '#888',
              }}
            >
              {formatDate(
                comentariu.createdAt,
                lang,
              )}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              color: '#333',
            }}
          >
            {comentariu.continut}
          </p>

          {user && (
            <button
              type="button"
              onClick={() => {
                setReplyTo(comentariu.id)
                setCommentMessage('')
                setCommentError('')
              }}
              style={{
                border: 0,
                background: 'transparent',
                padding: '8px 0 0',
                color: '#185FA5',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {ro ? 'Răspunde' : 'Reply'}
            </button>
          )}
        </div>

        {children.map((child) =>
          renderComment(
            child,
            Math.min(depth + 1, 4),
            nextPath,
          ),
        )}
      </div>
    )
  }

  const roots = byParent.get('root') ?? []
  const orphaned = comentarii.filter(
    (comentariu) =>
      comentariu.raspunsLa !== null &&
      !commentById.has(
        String(comentariu.raspunsLa),
      ),
  )

  const replyComment =
    replyTo === null
      ? null
      : commentById.get(String(replyTo)) ?? null

  return (
    <section
      aria-labelledby={`comments-${targetType}-${targetId}`}
      style={{
        marginTop: 42,
        paddingTop: 28,
        borderTop: '1px solid #dedede',
      }}
    >
      <h2
        id={`comments-${targetType}-${targetId}`}
        style={{
          margin: '0 0 18px',
          fontSize: 22,
        }}
      >
        {ro ? 'Comentarii' : 'Comments'}
        {!comentariiLoading &&
          ` (${comentarii.length})`}
      </h2>

      {comentariiLoading ? (
        <p style={{ color: '#777' }}>
          {ro
            ? 'Se încarcă discuția…'
            : 'Loading discussion…'}
        </p>
      ) : comentariiError ? (
        <div
          style={{
            marginBottom: 20,
            fontSize: 14,
            color: '#8A3A2A',
          }}
        >
          {ro
            ? 'Comentariile nu pot fi încărcate momentan.'
            : 'Comments cannot be loaded right now.'}
          {' '}
          <button
            type="button"
            onClick={() => void loadComments()}
            style={{
              border: 0,
              background: 'transparent',
              color: '#185FA5',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 600,
            }}
          >
            {ro ? 'Reîncearcă' : 'Retry'}
          </button>
        </div>
      ) : comentarii.length === 0 ? (
        <p
          style={{
            color: '#666',
            marginBottom: 22,
          }}
        >
          {ro
            ? 'Nu există încă comentarii aprobate. Poți deschide tu discuția.'
            : 'There are no approved comments yet. You can start the discussion.'}
        </p>
      ) : (
        <div style={{ marginBottom: 26 }}>
          {[...roots, ...orphaned].map(
            (comentariu) =>
              renderComment(comentariu),
          )}
        </div>
      )}

      {!authChecked ? (
        <p style={{ color: '#777' }}>
          {ro
            ? 'Verificăm sesiunea…'
            : 'Checking your session…'}
        </p>
      ) : user ? (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#f6f6f4',
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: '#444',
              }}
            >
              {ro
                ? 'Conectat ca'
                : 'Signed in as'}{' '}
              <strong>
                {user.nume ||
                  user.email ||
                  (ro ? 'Cititor' : 'Reader')}
              </strong>
            </span>

            <button
              type="button"
              disabled={authBusy}
              onClick={() => void logout()}
              style={{
                border: 0,
                background: 'transparent',
                color: '#185FA5',
                cursor: authBusy
                  ? 'default'
                  : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {ro ? 'Ieșire' : 'Sign out'}
            </button>
          </div>

          <form onSubmit={submitComment}>
            {replyComment && (
              <div
                style={{
                  marginBottom: 10,
                  padding: '9px 11px',
                  borderRadius: 8,
                  background: '#EEF4FB',
                  fontSize: 13,
                  color: '#444',
                }}
              >
                {ro
                  ? 'Răspuns pentru'
                  : 'Replying to'}{' '}
                <strong>
                  {replyComment.autor.nume}
                </strong>
                {' · '}
                <button
                  type="button"
                  onClick={() =>
                    setReplyTo(null)
                  }
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: 0,
                    color: '#185FA5',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {ro ? 'anulează' : 'cancel'}
                </button>
              </div>
            )}

            <label
              htmlFor={`comment-text-${targetType}-${targetId}`}
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {replyComment
                ? ro
                  ? 'Scrie răspunsul'
                  : 'Write your reply'
                : ro
                  ? 'Adaugă un comentariu'
                  : 'Add a comment'}
            </label>

            <textarea
              id={`comment-text-${targetType}-${targetId}`}
              value={continut}
              maxLength={2000}
              rows={5}
              onChange={(event) =>
                setContinut(event.target.value)
              }
              placeholder={
                ro
                  ? 'Contribuie la discuție într-un mod respectuos și relevant.'
                  : 'Contribute to the discussion in a respectful and relevant way.'
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 12,
                border: '1px solid #cfcfcf',
                borderRadius: 8,
                resize: 'vertical',
                font: 'inherit',
                lineHeight: 1.5,
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#888',
                }}
              >
                {continut.length}/2000
              </span>

              <button
                type="submit"
                disabled={
                  commentBusy ||
                  !continut.trim()
                }
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: '10px 16px',
                  background: '#185FA5',
                  color: '#fff',
                  cursor:
                    commentBusy ||
                    !continut.trim()
                      ? 'default'
                      : 'pointer',
                  fontWeight: 600,
                  opacity:
                    commentBusy ||
                    !continut.trim()
                      ? 0.65
                      : 1,
                }}
              >
                {commentBusy
                  ? ro
                    ? 'Se trimite…'
                    : 'Sending…'
                  : ro
                    ? 'Trimite comentariul'
                    : 'Submit comment'}
              </button>
            </div>

            <p
              style={{
                margin: '10px 0 0',
                fontSize: 12,
                color: '#777',
              }}
            >
              {ro
                ? 'Comentariile sunt moderate înainte de publicare.'
                : 'Comments are moderated before publication.'}
            </p>

            {commentMessage && (
              <p
                role="status"
                style={{
                  margin: '10px 0 0',
                  color: '#2F6B3B',
                  fontSize: 14,
                }}
              >
                {commentMessage}
              </p>
            )}

            {commentError && (
              <p
                role="alert"
                style={{
                  margin: '10px 0 0',
                  color: '#8A3A2A',
                  fontSize: 14,
                }}
              >
                {commentError}
              </p>
            )}
          </form>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #dedede',
            borderRadius: 10,
            padding: 18,
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              color: '#555',
              fontSize: 14,
            }}
          >
            {ro
              ? 'Autentifică-te sau creează un cont verificat pentru a participa la discuție.'
              : 'Sign in or create a verified account to join the discussion.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
                setRegisterSent(false)
              }}
              style={{
                border:
                  authMode === 'login'
                    ? '1px solid #185FA5'
                    : '1px solid #d6d6d6',
                borderRadius: 8,
                padding: '8px 12px',
                background:
                  authMode === 'login'
                    ? '#EEF4FB'
                    : '#fff',
                color: '#185FA5',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {ro ? 'Autentificare' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setAuthError('')
                setRegisterSent(false)
              }}
              style={{
                border:
                  authMode === 'register'
                    ? '1px solid #185FA5'
                    : '1px solid #d6d6d6',
                borderRadius: 8,
                padding: '8px 12px',
                background:
                  authMode === 'register'
                    ? '#EEF4FB'
                    : '#fff',
                color: '#185FA5',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {ro
                ? 'Creează cont'
                : 'Create account'}
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={login}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(event) =>
                    setLoginEmail(
                      event.target.value,
                    )
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 5,
                    padding: 10,
                    border: '1px solid #ccc',
                    borderRadius: 7,
                    font: 'inherit',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'block',
                  marginBottom: 12,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {ro ? 'Parolă' : 'Password'}
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(event) =>
                    setLoginPassword(
                      event.target.value,
                    )
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 5,
                    padding: 10,
                    border: '1px solid #ccc',
                    borderRadius: 7,
                    font: 'inherit',
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={authBusy}
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 14px',
                  background: '#185FA5',
                  color: '#fff',
                  cursor:
                    authBusy
                      ? 'default'
                      : 'pointer',
                  fontWeight: 600,
                  opacity:
                    authBusy
                      ? 0.65
                      : 1,
                }}
              >
                {authBusy
                  ? ro
                    ? 'Se conectează…'
                    : 'Signing in…'
                  : ro
                    ? 'Autentifică-te'
                    : 'Sign in'}
              </button>
            </form>
          ) : registerSent ? (
            <div
              role="status"
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#EEF7F0',
                color: '#2F6B3B',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {ro
                ? 'Dacă adresa poate fi înregistrată, am trimis un email de confirmare. După confirmare, revino aici și autentifică-te.'
                : 'If the address can be registered, we sent a confirmation email. After confirming it, return here and sign in.'}
            </div>
          ) : (
            <form onSubmit={register}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {ro ? 'Nume afișat' : 'Display name'}
                <input
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={registerName}
                  onChange={(event) =>
                    setRegisterName(
                      event.target.value,
                    )
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 5,
                    padding: 10,
                    border: '1px solid #ccc',
                    borderRadius: 7,
                    font: 'inherit',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'block',
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={registerEmail}
                  onChange={(event) =>
                    setRegisterEmail(
                      event.target.value,
                    )
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 5,
                    padding: 10,
                    border: '1px solid #ccc',
                    borderRadius: 7,
                    font: 'inherit',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'block',
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {ro ? 'Parolă' : 'Password'}
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  value={registerPassword}
                  onChange={(event) =>
                    setRegisterPassword(
                      event.target.value,
                    )
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 5,
                    padding: 10,
                    border: '1px solid #ccc',
                    borderRadius: 7,
                    font: 'inherit',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  margin: '12px 0',
                  fontSize: 12,
                  color: '#555',
                  lineHeight: 1.45,
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(event) =>
                    setAcceptPrivacy(
                      event.target.checked,
                    )
                  }
                  style={{ marginTop: 2 }}
                />
                <span>
                  {ro
                    ? 'Am citit și accept '
                    : 'I have read and accept the '}
                  <a
                    href={`/${ro ? 'ro' : 'en'}/politica-confidentialitate`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#185FA5',
                    }}
                  >
                    {ro
                      ? 'Politica de Confidențialitate'
                      : 'Privacy Policy'}
                  </a>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={authBusy}
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 14px',
                  background: '#185FA5',
                  color: '#fff',
                  cursor:
                    authBusy
                      ? 'default'
                      : 'pointer',
                  fontWeight: 600,
                  opacity:
                    authBusy
                      ? 0.65
                      : 1,
                }}
              >
                {authBusy
                  ? ro
                    ? 'Se creează…'
                    : 'Creating…'
                  : ro
                    ? 'Creează contul'
                    : 'Create account'}
              </button>
            </form>
          )}

          {authError && (
            <p
              role="alert"
              style={{
                margin: '12px 0 0',
                color: '#8A3A2A',
                fontSize: 14,
              }}
            >
              {authError}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
