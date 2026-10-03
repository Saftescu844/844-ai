import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const mounted = new Set<Root>()
function render(element: ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted.add(root)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReactNode) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount())
      mounted.delete(root)
      container.remove()
    },
  }
}
function cleanup() {
  for (const root of mounted) act(() => root.unmount())
  mounted.clear()
  document.body.innerHTML = ''
}
function buttons(name: string | RegExp) {
  return [...document.querySelectorAll('button')].filter((button) =>
    typeof name === 'string' ? button.textContent === name : name.test(button.textContent || ''),
  )
}
function click(name: string | RegExp, index = 0) {
  const button = buttons(name)[index]
  expect(button, `Missing button: ${name}`).toBeTruthy()
  act(() => button.click())
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
import { renderToStaticMarkup } from 'react-dom/server'
import ExternalVideo from '@/components/ExternalVideo'
import { externalVideoSource } from '@/lib/external-video'
import LectiiAcordeon from '@/app/(frontend)/[lang]/curs/[slug]/LectiiAcordeon'
import { jsxConvertersCuImagini } from '@/lib/richtext-converters'

vi.mock('next/navigation', () => ({ usePathname: () => '/en/articol/example' }))
afterEach(cleanup)
const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const vimeo = 'https://vimeo.com/123456789'

describe('external video consent', () => {
  it.each(['ro', 'en'])(
    'server rendering is blocked in %s without external loading elements',
    (lang) => {
      const html = renderToStaticMarkup(<ExternalVideo url={youtube} lang={lang} />)
      expect(html).not.toMatch(/<(iframe|img|script|link)\b/)
      expect(html).toContain(`/${lang}/politica-cookie-uri`)
    },
  )

  it('refusal blocks the player, acceptance loads only this video, withdrawal removes it', () => {
    const { container } = render(
      <>
        <ExternalVideo url={youtube} title="First video" />
        <ExternalVideo url={vimeo} title="Second video" />
      </>,
    )
    click('Decline')
    expect(container.querySelector('iframe')).toBeNull()
    expect(document.body.textContent).toContain('You declined')
    click('Accept and load video')
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    expect(container.querySelector('iframe')?.src).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    click('Withdraw consent and stop video')
    expect(container.querySelector('iframe')).toBeNull()
    expect(document.activeElement?.textContent).toBe('Accept and load video')
  })

  it('a new source and a remounted player require fresh consent', () => {
    const view = render(<ExternalVideo url={youtube} lang="ro" />)
    click('Accept și încarc videoclipul')
    view.rerender(<ExternalVideo url={vimeo} lang="ro" />)
    expect(view.container.querySelector('iframe')).toBeNull()
    click('Accept și încarc videoclipul')
    view.unmount()
    const next = render(<ExternalVideo url={vimeo} lang="ro" />)
    expect(next.container.querySelector('iframe')).toBeNull()
  })

  it('course opening does not load the provider and reopening resets consent', () => {
    const { container } = render(
      <LectiiAcordeon lang="en" lectii={[{ titlu: 'Lesson', videoURL: vimeo }]} />,
    )
    click(/Lesson/)
    expect(container.querySelector('iframe')).toBeNull()
    click('Accept and load video')
    expect(container.querySelector('iframe')).not.toBeNull()
    click(/Lesson/)
    click(/Lesson/)
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('rich-text video blocks use the same consent control and route language', () => {
    const converters = jsxConvertersCuImagini({ defaultConverters: {} } as never)
    const video = converters.blocks?.video
    expect(typeof video).toBe('function')
    if (typeof video !== 'function') throw new Error('Video converter missing')
    const { container } = render(
      video({ node: { fields: { url: youtube, titlu: 'Embedded' } } } as never),
    )
    expect(container.querySelector('iframe')).toBeNull()
    click('Accept and load video')
    expect(container.querySelector('iframe')).not.toBeNull()
  })
})

describe('external video URL validation', () => {
  it.each([
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'data:text/html,hello',
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://user:password@vimeo.com/1234',
    'https://vimeo.com:8080/1234',
    'https://youtube.com/embed/invalid',
  ])('rejects unsafe or unsupported input: %s', (url) => {
    expect(externalVideoSource(url)).toBeNull()
    expect(renderToStaticMarkup(<ExternalVideo url={url} />)).not.toContain('<iframe')
  })

  it('supports normal embed/share URLs and preserves Vimeo unlisted access hashes', () => {
    expect(externalVideoSource('https://youtu.be/dQw4w9WgXcQ')?.embedUrl).toContain(
      'youtube-nocookie.com/embed/',
    )
    expect(externalVideoSource('https://player.vimeo.com/video/1234?h=abc123')?.embedUrl).toBe(
      'https://player.vimeo.com/video/1234?dnt=1&h=abc123',
    )
    expect(externalVideoSource('https://vimeo.com/1234/abc123')?.embedUrl).toContain('h=abc123')
  })
})
