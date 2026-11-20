/** Resolve media IDs for the client-side preview without changing the form value. */
export async function populateEditorPreview(content: any, api: string, fetchMedia: typeof fetch = fetch) {
  const preview = structuredClone(content)
  const uploads: any[] = []
  const walk = (node: any) => {
    if (node.type === 'upload' && node.relationTo === 'media' && !node.value?.url) uploads.push(node)
    for (const child of node.children || []) walk(child)
  }
  walk(preview.root)
  const ids = [...new Set(uploads.map(node => typeof node.value === 'object' ? node.value?.id : node.value).filter(Boolean))]
  for (let offset = 0; offset < ids.length; offset += 20) {
    const query = new URLSearchParams({ depth: '0', limit: '20', 'where[id][in]': ids.slice(offset, offset + 20).join(',') })
    const response = await fetchMedia(`${api}/media?${query}`, { credentials: 'same-origin' })
    if (!response.ok) throw new Error('Imaginile nu au putut fi încărcate pentru previzualizare.')
    const result = await response.json()
    for (const node of uploads) {
      const id = typeof node.value === 'object' ? node.value?.id : node.value
      const media = result.docs?.find((doc: any) => String(doc.id) === String(id))
      if (media) node.value = media
    }
  }
  if (uploads.some(node => !node.value?.url)) throw new Error('O imagine lipsește sau nu este accesibilă. Verifică biblioteca Media.')
  return preview
}
