function videoEmbed(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return 'https://www.youtube.com/embed/' + yt[1]
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return 'https://player.vimeo.com/video/' + vm[1]
  return null
}
const url = 'https://www.youtube.com/watch?v=iG9CE55wbtY&list=PLOGi5-fAu8bGiEvsxHyAvT8oIwkV8aOVk'
console.log('URL embed generat:', videoEmbed(url))
