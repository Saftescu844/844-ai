import crypto from 'crypto'

const SECRET = process.env.PAYLOAD_SECRET || ''
const BREVO_KEY = process.env.MAIL_API_KEY || process.env.BREVO_API_KEY || ''
const SITE = 'https://844-ai.ro'
const EXPIRA_ZILE = 7

/** Semnătură HMAC pentru email + timestamp. Nu stocăm nimic în baza de date. */
function semneaza(email: string, ts: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(email + '|' + ts)
    .digest('hex')
}

export function construiesteLink(email: string, lang: string): string {
  const ts = Date.now().toString()
  const sig = semneaza(email, ts)
  const e = Buffer.from(email, 'utf8').toString('base64url')
  return `${SITE}/${lang}/confirmare-newsletter?e=${e}&t=${ts}&s=${sig}`
}

export function decodeazaEmail(e: string): string {
  try {
    return Buffer.from(e, 'base64url').toString('utf8')
  } catch {
    return ''
  }
}

/** Verifică semnătura și expirarea. Returnează true doar dacă ambele sunt valide. */
export function verificaToken(email: string, ts: string, sig: string): boolean {
  if (!email || !ts || !sig || !SECRET) return false

  const varsta = Date.now() - Number(ts)
  if (!Number.isFinite(varsta) || varsta < 0 || varsta > EXPIRA_ZILE * 86400000) return false

  const asteptat = semneaza(email, ts)
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(asteptat, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function trimiteConfirmare(email: string, lang: string): Promise<void> {
  if (!BREVO_KEY) {
    console.warn('[newsletter] BREVO_API_KEY lipsește — email de confirmare nu a fost trimis')
    return
  }

  const link = construiesteLink(email, lang)
  const ro = lang === 'ro'

  const subiect = ro
    ? 'Confirmă abonarea la newsletterul 844-ai.ro'
    : 'Confirm your 844-ai.ro newsletter subscription'

  const corp = ro
    ? `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Tot ce contează în AI, într-un singur loc.</p>
        <p>Bună,</p>
        <p>Ai cerut abonarea la newsletterul 844-ai.ro. Confirmă adresa printr-un click:</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirmă abonarea</a>
        </p>
        <p style="font-size:13px;color:#666">Linkul e valabil ${EXPIRA_ZILE} zile. Dacă nu ai cerut această abonare, ignoră mesajul — nu vei primi nimic altceva.</p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px">
          Datele tale sunt prelucrate conform <a href="${SITE}/ro/politica-confidentialitate" style="color:#185FA5">Politicii de Confidențialitate</a>.
        </p>
      </div>`
    : `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.6;color:#1a1a1a">
        <p style="font-size:19px;font-weight:700;margin:0 0 4px"><span style="color:#C41E3A">844-ai</span>.ro</p>
        <p style="color:#555;font-size:13px;margin:0 0 24px">Everything that matters in AI, in one place.</p>
        <p>Hi,</p>
        <p>You requested a subscription to the 844-ai.ro newsletter. Please confirm your address:</p>
        <p style="margin:26px 0">
          <a href="${link}" style="background:#185FA5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Confirm subscription</a>
        </p>
        <p style="font-size:13px;color:#666">This link is valid for ${EXPIRA_ZILE} days. If you didn't request this, simply ignore this message.</p>
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
      sender: { name: '844-ai.ro', email: 'newsletter@844-ai.ro' },
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
