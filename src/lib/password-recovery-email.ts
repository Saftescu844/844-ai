export type AccountLanguage =
  | 'ro'
  | 'en'

function normalizedSite(): string {
  return (
    process.env.SITE_URL ||
    'https://844-ai.ro'
  ).replace(/\/+$/, '')
}

export function accountLanguage(
  user: unknown,
): AccountLanguage {
  if (
    user &&
    typeof user === 'object' &&
    'limbaPreferata' in user &&
    user.limbaPreferata === 'en'
  ) {
    return 'en'
  }

  return 'ro'
}

export function passwordResetSubject(
  lang: AccountLanguage,
): string {
  return lang === 'ro'
    ? 'Resetează parola contului 844-ai.ro'
    : 'Reset your 844-ai.ro password'
}

export function passwordResetHTML(
  token: string,
  lang: AccountLanguage,
  site = normalizedSite(),
): string {
  const ro = lang === 'ro'

  const link =
    `${site}/${lang}/resetare-parola?token=${encodeURIComponent(token)}`

  return ro
    ? `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Înțelege AI. Folosește-l. Construiește viitorul.</p>
        <p>Bună,</p>
        <p>Am primit o cerere de resetare a parolei contului tău 844-ai.ro.</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Resetează parola</a>
        </p>
        <p style="font-size:13px;color:#666">Linkul este valabil o oră. Dacă nu ai cerut resetarea parolei, ignoră mesajul.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Datele tale sunt prelucrate conform <a href="${site}/ro/politica-confidentialitate" style="color:#185FA5">Politicii de Confidențialitate</a>.
        </p>
      </div>`
    : `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Understand AI. Use it. Build the future.</p>
        <p>Hi,</p>
        <p>We received a request to reset the password for your 844-ai.ro account.</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Reset password</a>
        </p>
        <p style="font-size:13px;color:#666">This link is valid for one hour. If you did not request a password reset, simply ignore this message.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Your data is processed according to our <a href="${site}/en/politica-confidentialitate" style="color:#185FA5">Privacy Policy</a>.
        </p>
      </div>`
}
