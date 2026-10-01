export type PublicAccountInput = {
  email: string
  parola: string
  nume: string
  limba: 'ro' | 'en'
}

export type PublicAccountValidation =
  | {
      ok: true
      value: PublicAccountInput
    }
  | {
      ok: false
      camp: 'cerere' | 'email' | 'parola' | 'nume'
    }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 10
const PASSWORD_MAX = 128
const NUME_MAX = 80

export function parsePublicAccountInput(
  body: unknown,
): PublicAccountValidation {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      camp: 'cerere',
    }
  }

  const date =
    body as Record<string, unknown>

  const email =
    String(date.email ?? '')
      .trim()
      .toLowerCase()

  const parola =
    String(date.parola ?? '')

  const nume =
    String(date.nume ?? '').trim()

  const limba: 'ro' | 'en' =
    date.limba === 'en'
      ? 'en'
      : 'ro'

  if (
    !EMAIL_REGEX.test(email) ||
    email.length > 254
  ) {
    return {
      ok: false,
      camp: 'email',
    }
  }

  if (
    parola.length < PASSWORD_MIN ||
    parola.length > PASSWORD_MAX
  ) {
    return {
      ok: false,
      camp: 'parola',
    }
  }

  if (
    nume.length < 2 ||
    nume.length > NUME_MAX
  ) {
    return {
      ok: false,
      camp: 'nume',
    }
  }

  return {
    ok: true,
    value: {
      email,
      parola,
      nume,
      limba,
    },
  }
}
