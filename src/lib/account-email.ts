const BREVO_KEY = process.env.BREVO_API_KEY || ''
const SITE = (process.env.SITE_URL || 'https://844-ai.ro').replace(/\/+$/, '')

export async function trimiteConfirmareCont(
  email: string,
  token: string,
  lang: 'ro' | 'en',
): Promise<void> {
  if (!BREVO_KEY) {
    throw new Error('BREVO_API_KEY nu este configurată')
  }

  if (!token) {
    throw new Error('Tokenul de verificare al contului lipsește')
  }

  const ro = lang === 'ro'
  const link =
    `${SITE}/${lang}/confirmare-cont?token=${encodeURIComponent(token)}`

  const subiect = ro
    ? 'Confirmă contul tău 844-ai.ro'
    : 'Confirm your 844-ai.ro account'

  const corp = ro
    ? `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Înțelege AI. Folosește-l. Construiește viitorul.</p>
        <p>Bună,</p>
        <p>Ai creat un cont pe 844-ai.ro. Confirmă adresa de email pentru a te putea autentifica și participa la discuții:</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirmă contul</a>
        </p>
        <p style="font-size:13px;color:#666">Dacă nu ai creat acest cont, ignoră mesajul.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Datele tale sunt prelucrate conform <a href="${SITE}/ro/politica-confidentialitate" style="color:#185FA5">Politicii de Confidențialitate</a>.
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
        <p style="font-size:13px;color:#666">If you did not create this account, simply ignore this message.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Your data is processed according to our <a href="${SITE}/en/politica-confidentialitate" style="color:#185FA5">Privacy Policy</a>.
        </p>
      </div>`

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      'api-key': BREVO_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: '844-ai.ro',
        email: 'newsletter@844-ai.ro',
      },
      to: [{ email }],
      subject: subiect,
      htmlContent: corp,
    }),
  })

  if (!resp.ok) {
    const detaliu = await resp.text()
    throw new Error(`Brevo ${resp.status}: ${detaliu}`)
  }
}
