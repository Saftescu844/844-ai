import type {
  AccountLanguage,
} from '@/lib/password-recovery-email'

function normalizedSite(): string {
  return (
    process.env.SITE_URL ||
    'https://844-ai.ro'
  ).replace(/\/+$/, '')
}

export function accountVerificationSubject(
  lang: AccountLanguage,
): string {
  return lang === 'ro'
    ? 'Confirmă contul tău 844-ai.ro'
    : 'Confirm your 844-ai.ro account'
}

export function accountVerificationHTML(
  token: string,
  lang: AccountLanguage,
  site = normalizedSite(),
): string {
  const ro = lang === 'ro'

  const link =
    `${site}/${lang}/confirmare-cont?token=${encodeURIComponent(token)}`

  return ro
    ? `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Înțelege AI. Folosește-l. Construiește viitorul.</p>
        <p>Bună,</p>
        <p>Ai creat un cont pe 844-ai.ro. Confirmă adresa de email pentru a te putea autentifica și participa la discuții:</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirmă contul</a>
        </p>
        <p style="font-size:12px;color:#666">Dacă butonul nu funcționează, copiază și deschide acest link în browser:</p>
        <p style="font-size:12px;word-break:break-all"><a href="${link}" style="color:#185FA5">${link}</a></p>
        <p style="font-size:13px;color:#666">Dacă nu ai creat acest cont, ignoră mesajul.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Datele tale sunt prelucrate conform <a href="${site}/ro/politica-confidentialitate" style="color:#185FA5">Politicii de Confidențialitate</a>.
        </p>
      </div>`
    : `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Understand AI. Use it. Build the future.</p>
        <p>Hi,</p>
        <p>You created an account on 844-ai.ro. Confirm your email address before signing in and joining discussions:</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirm account</a>
        </p>
        <p style="font-size:12px;color:#666">If the button does not work, copy and open this link in your browser:</p>
        <p style="font-size:12px;word-break:break-all"><a href="${link}" style="color:#185FA5">${link}</a></p>
        <p style="font-size:13px;color:#666">If you did not create this account, simply ignore this message.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Your data is processed according to our <a href="${site}/en/politica-confidentialitate" style="color:#185FA5">Privacy Policy</a>.
        </p>
      </div>`
}
