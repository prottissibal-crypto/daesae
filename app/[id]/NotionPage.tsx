'use client'

import { NotionRenderer } from 'react-notion-x'

export default function NotionPage({ recordMap }: { recordMap: any }) {
  return <NotionRenderer recordMap={recordMap} fullPage />
}
