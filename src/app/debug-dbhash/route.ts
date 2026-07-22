import crypto from 'crypto'

export async function GET() {
  const url = process.env.DATABASE_URL || ''
  const hash = crypto.createHash('sha256').update(url).digest('hex')
  return new Response(hash)
}
