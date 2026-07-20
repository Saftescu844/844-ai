import React from 'react'
import './styles.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: '844-ai.ro — Tot ce contează în AI, într-un singur loc',
    template: '%s | 844-ai.ro',
  },
  description:
    'Platformă românească de referință pentru inteligența artificială: știri AI, sănătate, educație, tool directory și afaceri. Bilingv RO/EN.',
  metadataBase: new URL('https://844-ai.ro'),
  openGraph: {
    siteName: '844-ai.ro',
    type: 'website',
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
