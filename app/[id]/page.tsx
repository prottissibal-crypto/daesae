import { NotionAPI } from 'notion-client'
import NotionPage from './NotionPage'

const notion = new NotionAPI()

export const dynamic = 'force-dynamic'

export default async function Page({
  params
}: {
  params: { id: string }
}) {
  const id = params.id.replace(/-/g, '')

  const recordMap = await notion.getPage(id)

  return (
    <main>
      <NotionPage recordMap={recordMap} />
    </main>
  )
}
