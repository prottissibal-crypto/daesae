'use client'

import dynamic from 'next/dynamic'
import { NotionRenderer } from 'react-notion-x'

import 'react-notion-x/src/styles.css'
import 'prismjs/themes/prism-tomorrow.css'
import 'katex/dist/katex.min.css'

const Code = dynamic(
  () => import('react-notion-x/build/third-party/code').then(m => m.Code),
  { ssr: false }
)

const Collection = dynamic(
  () =>
    import('react-notion-x/build/third-party/collection').then(
      m => m.Collection
    ),
  { ssr: false }
)

const Equation = dynamic(
  () =>
    import('react-notion-x/build/third-party/equation').then(
      m => m.Equation
    ),
  { ssr: false }
)

const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then(m => m.Modal),
  { ssr: false }
)

export default function NotionPage({ recordMap }: { recordMap: any }) {
  return (
    <NotionRenderer
      recordMap={recordMap}
      fullPage
      components={{
        Code,
        Collection,
        Equation,
        Modal
      }}
    />
  )
}
