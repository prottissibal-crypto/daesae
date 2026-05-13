export const dynamic = 'force-dynamic'

export default function Page({
  params
}: {
  params: { id: string }
}) {
  const id = params.id

  const url = `https://www.notion.so/${id}`

  return (
    <main
      style={{
        width: '100%',
        height: '100vh',
        margin: 0,
        padding: 0
      }}
    >
      <iframe
        src={url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        allowFullScreen
      />
    </main>
  )
}
