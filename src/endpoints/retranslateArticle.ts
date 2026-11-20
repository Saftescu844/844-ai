import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { articleTranslationHash } from '@/lib/article-translation-hash'
import type { TraducereRezultat, traduceArticol } from '../../translator'

type Proposal = TraducereRezultat
type Claims = {
  version: 1; sourceID: number; targetID: number; actor: string
  sourceRevision: string; targetRevision: string; candidateHash: string; expires: number
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const relationID = (value: any): number | undefined => value && typeof value === 'object' ? value.id : value
const actor = (req: PayloadRequest) => JSON.stringify([req.user?.collection, req.user?.id])
const revision = (doc: any) => digest([doc.updatedAt, doc._status, doc.editorialStatus,
  relationID(doc.versiuneAlternativa), articleTranslationHash(doc), doc.metaTitle, doc.metaDescription])

function assertEditor(req: PayloadRequest) {
  if (!req.user || !['admin', 'editor'].includes(req.user.rol || '')) {
    throw new APIError('Acces rezervat editorilor și administratorilor.', 403)
  }
}

function signature(req: PayloadRequest, encoded: string) {
  const secret = req.payload.config.secret
  if (!secret) throw new APIError('Semnarea propunerii nu este disponibilă.', 503)
  return createHmac('sha256', secret).update('article-retranslation-v1\n' + encoded).digest()
}

function seal(req: PayloadRequest, claims: Claims) {
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return encoded + '.' + signature(req, encoded).toString('base64url')
}

function unseal(req: PayloadRequest, token: unknown): Claims {
  if (typeof token !== 'string' || token.length > 4096) throw new APIError('Propunere invalidă.', 400)
  const parts = token.split('.')
  if (parts.length !== 2) throw new APIError('Propunere invalidă.', 400)
  const supplied = Buffer.from(parts[1], 'base64url')
  const expected = signature(req, parts[0])
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new APIError('Propunerea nu poate fi verificată. Pregătește o propunere nouă.', 403)
  }
  let claims: Claims
  try { claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) } catch {
    throw new APIError('Propunere invalidă.', 400)
  }
  if (claims.version !== 1 || claims.actor !== actor(req)) throw new APIError('Propunerea aparține altei sesiuni editoriale.', 403)
  if (!Number.isFinite(claims.expires) || claims.expires <= Date.now()) {
    throw new APIError('Propunerea a expirat. Pregătește traducerea din nou.', 409)
  }
  return claims
}

async function readPair(req: PayloadRequest, sourceID: number) {
  const read = (id: number) => req.payload.findByID({ collection: 'articole', id, draft: true, depth: 0, req, overrideAccess: false })
  const source = await read(sourceID)
  const targetID = relationID(source.versiuneAlternativa)
  if (source.limba !== 'ro' || !targetID || targetID === sourceID) {
    throw new APIError('Este necesară o pereche RO/EN asociată.', 409)
  }
  const target = await read(targetID)
  if (target.limba !== 'en' || relationID(target.versiuneAlternativa) !== sourceID) {
    throw new APIError('Legăturile RO/EN trebuie verificate înainte de retraducere.', 409)
  }
  return { source, target }
}

function editorialTexts(doc: any): Proposal {
  return { titlu: doc.titlu, excerpt: doc.excerpt, continut: doc.continut,
    metaTitle: doc.metaTitle, metaDescription: doc.metaDescription,
    galerie: doc.galerie, tags: doc.tags, videoTitlu: doc.videoTitlu }
}

function assertComplete(proposal: Proposal | null): asserts proposal is Proposal {
  if (!proposal || typeof proposal.titlu !== 'string' || !proposal.titlu.trim()
    || typeof proposal.excerpt !== 'string' || !proposal.excerpt.trim()
    || !Array.isArray(proposal.continut?.root?.children)) {
    throw new APIError('Traducerea nu este completă. Versiunea EN existentă a rămas intactă.', 422)
  }
}

/** Generate a signed, short-lived proposal. This phase never writes either article. */
export async function previewEnglishRetranslation(req: PayloadRequest, id: number, translate: typeof traduceArticol) {
  assertEditor(req)
  const { source, target } = await readPair(req, id)
  if (!source.excerpt?.trim()) throw new APIError('Completează și salvează rezumatul RO.', 400)
  const sourceRevision = revision(source)
  const targetRevision = revision(target)
  const proposal = await translate({ titlu: source.titlu, excerpt: source.excerpt, continut: source.continut,
    galerie: source.galerie, tags: source.tags, videoTitlu: source.videoTitlu })
  assertComplete(proposal)
  const fresh = await readPair(req, id)
  if (sourceRevision !== revision(fresh.source) || target.id !== fresh.target.id || targetRevision !== revision(fresh.target)) {
    throw new APIError('Un articol s-a schimbat în timpul traducerii. Reîncarcă și încearcă din nou.', 409)
  }
  const expires = Date.now() + 10 * 60 * 1000
  const token = seal(req, { version: 1, actor: actor(req), sourceID: id, targetID: target.id,
    sourceRevision, targetRevision, candidateHash: digest(proposal), expires })
  return { englishId: target.id, current: editorialTexts(target), proposal, token, expires }
}

/** Apply only the reviewed proposal to the same EN draft. Native Payload versions retain the old edition. */
export async function applyEnglishRetranslation(req: PayloadRequest, id: number, input: { token?: unknown; proposal?: Proposal }) {
  assertEditor(req)
  const claims = unseal(req, input.token)
  if (claims.sourceID !== id || !input.proposal || claims.candidateHash !== digest(input.proposal)) {
    throw new APIError('Propunerea nu corespunde articolului sau a fost modificată.', 409)
  }
  assertComplete(input.proposal)
  const ownsTransaction = await initTransaction(req)
  if (!ownsTransaction) throw new APIError('Salvarea sigură nu este disponibilă.', 503)
  try {
    const transactionID = await req.transactionID
    const session = transactionID && (req.payload.db as unknown as PostgresAdapter).sessions[String(transactionID)]
    if (!session) throw new APIError('Tranzacția nu este disponibilă.', 503)
    await session.db.execute(sql`SELECT id FROM articole WHERE id IN (${id}, ${claims.targetID}) ORDER BY id FOR UPDATE NOWAIT`)
    const { source, target } = await readPair(req, id)
    if (target.id !== claims.targetID || revision(source) !== claims.sourceRevision || revision(target) !== claims.targetRevision) {
      throw new APIError('RO sau EN s-a schimbat după pregătirea propunerii. Corecturile existente au fost păstrate. Pregătește o propunere nouă.', 409)
    }
    const proposal = input.proposal
    await req.payload.update({
      collection: 'articole', id: target.id, draft: true, req, overrideAccess: false,
      data: {
        titlu: proposal.titlu, excerpt: proposal.excerpt, continut: proposal.continut,
        metaTitle: proposal.metaTitle, metaDescription: proposal.metaDescription,
        galerie: proposal.galerie?.map(image => ({ imagine: relationID(image.imagine), caption: image.caption, credit: image.credit })) ?? [],
        tags: proposal.tags?.map(tag => ({ tag: tag.tag })) ?? [],
        videoTitlu: proposal.videoTitlu ?? null,
        verificatorEditorial: null, verificatorMedical: null,
        _status: 'draft', editorialStatus: 'review',
      },
    })
    await req.payload.update({ collection: 'articole', id, draft: true, req, overrideAccess: false,
      data: { continutHashTradus: articleTranslationHash(source), necesitaRetraducere: false } })
    await commitTransaction(req)
    return { englishId: target.id, applied: true }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

async function handle(req: PayloadRequest, apply: boolean): Promise<Response> {
  try {
    assertEditor(req)
    const origin = req.headers.get('origin')
    const expected = new URL(process.env.SITE_URL || req.url!).origin
    if (!origin || origin !== expected) throw new APIError('Origine invalidă.', 403)
    const id = Number(req.routeParams?.id)
    if (!Number.isSafeInteger(id) || id < 1) throw new APIError('Articol invalid.', 400)
    if (apply) {
      let input: any
      try { input = await req.json!() } catch { throw new APIError('Cerere invalidă.', 400) }
      if (!input || typeof input !== 'object') throw new APIError('Cerere invalidă.', 400)
      return Response.json(await applyEnglishRetranslation(req, id, input))
    }
    const { traduceArticol } = await import('../../translator')
    return Response.json(await previewEnglishRetranslation(req, id, traduceArticol))
  } catch (error) {
    if (error instanceof Error && error.name === 'TranslationRequiresEditorialReviewError') {
      return Response.json({ error: 'Traducerea necesită intervenție editorială. Versiunea EN existentă a fost păstrată.' }, { status: 422 })
    }
    if (error instanceof APIError) return Response.json({ error: error.message }, { status: error.status })
    return Response.json({ error: 'Operația nu a putut fi confirmată. Reîncarcă articolele și verifică draftul EN înainte de a reîncerca.' }, { status: 503 })
  }
}

export const previewEnglishRetranslationHandler = (req: PayloadRequest) => handle(req, false)
export const applyEnglishRetranslationHandler = (req: PayloadRequest) => handle(req, true)
