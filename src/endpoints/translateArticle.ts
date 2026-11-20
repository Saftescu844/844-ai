import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { articleTranslationHash } from '@/lib/article-translation-hash'
import type { TraducereRezultat } from '../../translator'

type Translate = (source: { titlu: string; excerpt: string; continut: any; galerie?: any[] | null; tags?: any[] | null; videoTitlu?: string | null }) => Promise<TraducereRezultat | null>
const relationID = (value: any): any => value && typeof value === 'object' ? value.id : value

/** First translation only. Never overwrite an existing EN edition or publish either document. */
export async function prepareEnglishDraft(req: PayloadRequest, id: number, translate: Translate) {
  if (!req.user || !['admin', 'editor'].includes(req.user.rol || '')) {
    throw new APIError('Acces rezervat editorilor și administratorilor.', 403)
  }
  const payload = req.payload
  const read = () => payload.findByID({ collection: 'articole', id, draft: true, depth: 0, req, overrideAccess: false })
  const source = await read()
  if (source.limba !== 'ro') throw new APIError('Traducerea pornește din articolul în română.', 400)
  if (source.versiuneAlternativa) return { englishId: relationID(source.versiuneAlternativa), created: false }
  if (!source.excerpt?.trim()) throw new APIError('Completează și salvează rezumatul înainte de traducere.', 400)
  const reverse = await payload.find({
    collection: 'articole', draft: true, depth: 0, req, overrideAccess: false, limit: 1,
    where: { versiuneAlternativa: { equals: id } },
  })
  if (reverse.totalDocs) throw new APIError('Există o versiune asociată invers. Verifică legăturile RO/EN.', 409)
  const translated = await translate({ titlu: source.titlu, excerpt: source.excerpt, continut: source.continut, galerie: source.galerie, tags: source.tags, videoTitlu: source.videoTitlu })
  if (!translated?.titlu?.trim() || !translated.excerpt?.trim() || !translated.continut) {
    throw new APIError('Traducerea nu este completă. Articolul original a rămas intact.', 422)
  }

  // Only the short final write phase holds a database transaction. The model request
  // has already finished. Row locking serializes this with normal Payload edits.
  const ownsTransaction = await initTransaction(req)
  if (!ownsTransaction) throw new APIError('Nu s-a putut iniția salvarea sigură a traducerii.', 503)
  try {
    const transactionID = await req.transactionID
    const session = transactionID && (payload.db as unknown as PostgresAdapter).sessions[String(transactionID)]
    if (!session) throw new APIError('Tranzacția nu este disponibilă.', 503)
    await session.db.execute(sql`SELECT id FROM articole WHERE id = ${id} FOR UPDATE NOWAIT`)
    const fresh = await read()
    if (fresh.updatedAt !== source.updatedAt || articleTranslationHash(fresh) !== articleTranslationHash(source) || fresh.versiuneAlternativa) {
      throw new APIError('Articolul RO a fost modificat între timp. Reîncarcă pagina înainte de traducere.', 409)
    }
    const freshReverse = await payload.find({
      collection: 'articole', draft: true, depth: 0, req, overrideAccess: false, limit: 1,
      where: { versiuneAlternativa: { equals: id } },
    })
    if (freshReverse.totalDocs) throw new APIError('O versiune EN a apărut între timp. Reîncarcă pagina.', 409)
    const created = await payload.create({
      collection: 'articole', draft: true, req, overrideAccess: false,
      data: {
        titlu: translated.titlu, slug: `article-${id}-en`, limba: 'en',
        pilon: relationID(source.pilon), tip: source.tip,
        excerpt: translated.excerpt, continut: translated.continut,
        metaTitle: translated.metaTitle, metaDescription: translated.metaDescription,
        galerie: translated.galerie?.map(image => ({ imagine: relationID(image.imagine), caption: image.caption, credit: image.credit })),
        tags: translated.tags?.map(tag => ({ tag: tag.tag })),
        videoTitlu: translated.videoTitlu, videoUrl: source.videoUrl,
        subcategorie: source.subcategorie, subcategorieEducatie: source.subcategorieEducatie,
        sursaNume: source.sursaNume, sursaLink: source.sursaLink,
        producator: source.producator, linkProducator: source.linkProducator,
        imaginePrincipala: relationID(source.imaginePrincipala),
        autorPrincipal: relationID(source.autorPrincipal),
        coautori: source.coautori?.map(relationID),
        contributoriExperti: source.contributoriExperti?.map(relationID),
        // Reviewers must explicitly sign off the translated edition.
        surse: source.surse?.map(relationID),
        generatAutomat: false, editorialStatus: 'review', _status: 'draft',
        versiuneAlternativa: id,
      },
    })
    await payload.update({
      collection: 'articole', id, draft: true, req, overrideAccess: false,
      data: { versiuneAlternativa: created.id, continutHashTradus: articleTranslationHash(source), necesitaRetraducere: false },
    })
    await commitTransaction(req)
    return { englishId: created.id, created: true }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

export async function translateArticleHandler(req: PayloadRequest): Promise<Response> {
  // Custom endpoints must enforce permissions and same-origin cookie requests explicitly.
  if (!req.user || !['admin', 'editor'].includes(req.user.rol || '')) {
    return Response.json({ error: 'Acces interzis.' }, { status: 403 })
  }
  const origin = req.headers.get('origin')
  const expectedOrigin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : new URL(req.url!).origin
  if (!origin || origin !== expectedOrigin) return Response.json({ error: 'Origine invalidă.' }, { status: 403 })
  const id = Number(req.routeParams?.id)
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: 'Articol invalid.' }, { status: 400 })
  try {
    const { traduceArticol } = await import('../../translator')
    const result = await prepareEnglishDraft(req, id, traduceArticol)
    return Response.json(result)
  } catch (error) {
    if (error instanceof APIError) return Response.json({ error: error.message }, { status: error.status })
    // No provider messages, document content, DB errors or secrets in the response.
    return Response.json({ error: 'Traducerea nu a putut fi salvată. Reîncarcă articolul și verifică versiunea alternativă înainte de a reîncerca.' }, { status: 503 })
  }
}
