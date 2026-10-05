export type ExternalVideoSource = {
  provider: 'YouTube' | 'Vimeo'
  embedUrl: string
  policyUrl: string
}

// Accept known providers only; never pass an editor-supplied URL straight to an iframe.
export function externalVideoSource(value: string): ExternalVideoSource | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)
  let id: string | null = null
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
    ].includes(host)
  ) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts'].includes(parts[0]) && parts.length === 2
          ? parts[1]
          : null
  } else if (host === 'youtu.be' && parts.length === 1) {
    id = parts[0]
  }
  if (id && /^[\w-]{11}$/.test(id)) {
    return {
      provider: 'YouTube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      policyUrl: 'https://policies.google.com/privacy',
    }
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    const videoParts = host === 'player.vimeo.com' && parts[0] === 'video' ? parts.slice(1) : parts
    if (videoParts.length < 1 || videoParts.length > 2 || !/^\d+$/.test(videoParts[0])) return null
    const hash = url.searchParams.get('h') || videoParts[1]
    if (hash && !/^[a-zA-Z0-9]+$/.test(hash)) return null
    const query = new URLSearchParams({ dnt: '1' })
    if (hash) query.set('h', hash)
    return {
      provider: 'Vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoParts[0]}?${query}`,
      policyUrl: 'https://vimeo.com/privacy',
    }
  }
  return null
}
