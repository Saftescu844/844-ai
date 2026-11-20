import { createHash } from 'node:crypto'

export function articleTranslationHash(article: { titlu?: unknown; excerpt?: unknown; continut?: unknown; galerie?: unknown; videoTitlu?: unknown; tags?: unknown }) {
  return 'sha256:' + createHash('sha256').update(JSON.stringify([
    article.titlu ?? '', article.excerpt ?? '', article.continut ?? null,
    article.galerie ?? null, article.videoTitlu ?? null, article.tags ?? null,
  ])).digest('hex')
}
