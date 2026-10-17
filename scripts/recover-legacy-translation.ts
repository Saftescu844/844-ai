/**
 * Recovery for a legacy RO article whose EN draft was not created.
 * Default mode is read-only. Production writes require separate approval,
 * --apply and --confirm-article-id=<same ID>. Never schedule this script.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { traduceArticol, slugEn } from '../translator'

async function main() {
  const idArg = process.argv.find((arg) => arg.startsWith('--article-id='))
  const articleId = Number(idArg?.split('=')[1])
  if (!Number.isSafeInteger(articleId) || articleId < 1) {
    throw new Error('Required: --article-id=<positive integer>')
  }
  const apply = process.argv.includes('--apply')
  const confirmed = process.argv.includes(`--confirm-article-id=${articleId}`)
  if (apply && !confirmed) {
    throw new Error('Write blocked: explicit --confirm-article-id=<same ID> required')
  }
  const payload = await getPayload({ config })
  const source = await payload.findByID({
    collection: 'articole', id: articleId, depth: 0, draft: true,
  })
  if (source.limba !== 'ro' || source._status === 'published') {
    throw new Error('Only an unpublished Romanian article can be recovered')
  }
  const linkedId = typeof source.versiuneAlternativa === 'object'
    ? source.versiuneAlternativa?.id : source.versiuneAlternativa
  const existing = await payload.find({
    collection: 'articole', depth: 0, draft: true, limit: 10,
    where: { versiuneAlternativa: { equals: articleId } },
  })
  const english = existing.docs.filter((doc) => doc.limba === 'en')
  if (linkedId || english.length > 1 || existing.docs.some((doc) => doc.limba !== 'en')) {
    throw new Error('Unexpected language links; manual editorial review required')
  }
  if (english.length === 1) {
    console.log(`Existing EN draft ID ${english[0].id}; RO link ${apply ? 'will be repaired' : 'missing (dry-run)'}`)
    if (apply) {
      await payload.update({
        collection: 'articole', id: articleId, draft: true,
        data: { versiuneAlternativa: english[0].id },
      })
    }
    return
  }
  console.log(`RO draft ${articleId} lacks an English partner; ${apply ? 'authorized recovery' : 'DRY-RUN: no writes'}`)
  if (!apply) return

  const translated = await traduceArticol({
    titlu: source.titlu,
    excerpt: source.excerpt || '',
    continut: source.continut,
  })
  if (!translated?.titlu || !translated.excerpt || !translated.continut) {
    throw new Error('Translation failed; RO draft unchanged, no EN draft created')
  }

  // Recheck before creating so a repeat invocation does not duplicate EN.
  const recheck = await payload.find({
    collection: 'articole', depth: 0, draft: true, limit: 1,
    where: { versiuneAlternativa: { equals: articleId } },
  })
  if (recheck.docs.length !== 0) throw new Error('EN partner appeared; abort duplicate creation')

  const created = await payload.create({
    collection: 'articole', draft: true,
    data: {
      titlu: translated.titlu,
      slug: slugEn(translated.titlu),
      limba: 'en',
      pilon: source.pilon,
      tip: source.tip,
      excerpt: translated.excerpt.substring(0, 298),
      continut: translated.continut,
      sursaNume: source.sursaNume,
      sursaLink: source.sursaLink,
      editorialStatus: 'review',
      generatAutomat: true,
      versiuneAlternativa: articleId,
      metaTitle: translated.metaTitle.substring(0, 58),
      metaDescription: translated.metaDescription.substring(0, 158),
      ...(source.subcategorie ? { subcategorie: source.subcategorie } : {}),
      ...(source.subcategorieEducatie ? { subcategorieEducatie: source.subcategorieEducatie } : {}),
    } as any,
  })
  try {
    await payload.update({
      collection: 'articole', id: articleId, draft: true,
      data: { versiuneAlternativa: created.id },
    })
  } catch (error) {
    console.error(`EN draft ${created.id} created but reciprocal link failed; rerun recovery after review`)
    throw error
  }
  console.log(`Recovered EN draft ${created.id} and linked it to RO ${articleId}; remains in review`)
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
