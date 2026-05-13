import { NotionAPI } from 'notion-client'
import { NotionRenderer } from 'react-notion-x'

const notion = new NotionAPI()

export default async function Page({
  params
}: {
  params: { id: string }
}) {
  const id = params.id.replace(/-/g, '')

  const recordMap = await notion.getPage(id)

  return (
    <main style={{ padding: 20 }}>
      <NotionRenderer recordMap={recordMap} fullPage />
    </main>
  )
}
