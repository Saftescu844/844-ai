import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

function lexicalToBlocks(continut: any): any[] {
  const blocks: any[] = []
  if (!continut?.root?.children) return blocks
  for (const node of continut.root.children) {
    if (node.type === 'upload') {
      blocks.push({ tip: 'upload', text: '', raw: node })
      continue
    }
    const text = (node.children || []).map((c: any) => c.text || '').join('')
    if (!text.trim()) continue
    blocks.push({ tip: node.type, tag: node.tag, text })
  }
  return blocks
}

async function main() {
  const payload = await getPayload({ config })
  const r = await payload.find({ collection: 'articole', where: { slug: { equals: 'aidoc-ai-radiologie-prezentare-mqywspae' } }, limit: 1, depth: 1 })
  const art: any = r.docs[0]
  const blocsToti = lexicalToBlocks(art.continut)
  console.log('Total blocuri extrase:', blocsToti.length)
  console.log('Din care upload:', blocsToti.filter(b => b.tip === 'upload').length)

  const blocuriText: any[] = []
  const uploadDupa: Record<number, any[]> = {}
  for (const b of blocsToti) {
    if (b.tip === 'upload') {
      const idx = blocuriText.length - 1
      ;(uploadDupa[idx] = uploadDupa[idx] || []).push(b.raw)
      console.log('  -> upload legat de idx text:', idx)
    } else {
      blocuriText.push(b)
    }
  }
  console.log('Total blocuri text:', blocuriText.length)
  console.log('Chei uploadDupa:', Object.keys(uploadDupa))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
