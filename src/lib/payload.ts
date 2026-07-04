import { getPayload } from 'payload'
import config from '@payload-config'

const LIMBI_VALIDE = ['ro', 'en']

export async function payloadClient() {
  return await getPayload({ config })
}

export async function getArticole(limba: string, optiuni: { limit?: number } = {}) {
  if (!LIMBI_VALIDE.includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  return await payload.find({
    collection: 'articole',
    where: { and: [ { limba: { equals: limba } }, { status: { equals: 'published' } } ] },
    limit: optiuni.limit || 12,
    sort: '-publishedAt',
    depth: 1,
  })
}

export async function getArticol(slug: string, limba: string) {
  if (!LIMBI_VALIDE.includes(limba)) return null
  const payload = await payloadClient()
  const r = await payload.find({
    collection: 'articole',
    where: { and: [ { slug: { equals: slug } }, { limba: { equals: limba } }, { status: { equals: 'published' } } ] },
    limit: 1,
    depth: 2,
  })
  return r.docs[0] || null
}

const LIMBI_VALIDE2 = ['ro', 'en']

export async function getTooluri(limba: string) {
  if (!LIMBI_VALIDE2.includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  return await payload.find({
    collection: 'tooluri',
    where: { activ: { equals: true } },
    limit: 60,
    sort: '-scor',
    locale: limba as any,
    depth: 1,
  })
}

export async function getArticolePilon(limba: string, pilonSlug: string) {
  if (!LIMBI_VALIDE2.includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  return await payload.find({
    collection: 'articole',
    where: { and: [ { limba: { equals: limba } }, { status: { equals: 'published' } }, { 'pilon.slug': { equals: pilonSlug } } ] },
    limit: 24,
    sort: '-publishedAt',
    depth: 1,
  })
}

const SUBCATEGORII_SANATATE = ['diagnostic', 'medicamente', 'asistenta-clinica', 'reglementare', 'pacienti']

export async function getArticoleSanatate(limba: string, subcategorie?: string) {
  if (!['ro', 'en'].includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  const conditii: any[] = [
    { limba: { equals: limba } },
    { status: { equals: 'published' } },
    { 'pilon.slug': { equals: 'sanatate' } },
  ]
  if (subcategorie && SUBCATEGORII_SANATATE.includes(subcategorie)) {
    conditii.push({ subcategorie: { equals: subcategorie } })
  }
  return await payload.find({
    collection: 'articole',
    where: { and: conditii },
    limit: 24,
    sort: '-publishedAt',
    depth: 1,
  })
}

export async function getArticoleEducatie(limba: string, subcategorie?: string) {
  if (!['ro', 'en'].includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  const conditii: any[] = [
    { limba: { equals: limba } },
    { status: { equals: 'published' } },
    { 'pilon.slug': { equals: 'educatie' } },
  ]
  const SUBCATEGORII_EDU = ['invatare-ai', 'institutii', 'instrumente-edu', 'cercetare', 'cariere']
  if (subcategorie && SUBCATEGORII_EDU.includes(subcategorie)) {
    conditii.push({ subcategorieEducatie: { equals: subcategorie } })
  }
  return await payload.find({
    collection: 'articole',
    where: { and: conditii },
    limit: 24,
    sort: '-publishedAt',
    depth: 1,
  })
}

export async function getRoadmaps(limba: string) {
  if (!['ro', 'en'].includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  return await payload.find({ collection: 'roadmaps', locale: limba as any, limit: 24, depth: 1 })
}

export async function getRoadmap(slug: string, limba: string) {
  if (!['ro', 'en'].includes(limba)) return null
  const payload = await payloadClient()
  const r = await payload.find({ collection: 'roadmaps', where: { slug: { equals: slug } }, locale: limba as any, limit: 1, depth: 1 })
  return r.docs[0] || null
}

export async function getCursuri(limba: string) {
  if (!['ro', 'en'].includes(limba)) return { docs: [] as any[] }
  const payload = await payloadClient()
  return await payload.find({ collection: 'cursuri', locale: limba as any, limit: 24, depth: 1 })
}

export async function getCurs(slug: string, limba: string) {
  if (!['ro', 'en'].includes(limba)) return null
  const payload = await payloadClient()
  const r = await payload.find({ collection: 'cursuri', where: { slug: { equals: slug } }, locale: limba as any, limit: 1, depth: 1 })
  return r.docs[0] || null
}
