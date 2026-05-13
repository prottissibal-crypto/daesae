export const dynamic = 'force-dynamic'

export default function Page({
  params
}: {
  params: { id: string }
}) {
  const id = params.id.replace(/-/g, '')
  const url = `https://www.notion.so/${id}?pvs=4`

  return (
    <iframe
      src={url}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 0
      }}
      allowFullScreen
    />
  )
}
