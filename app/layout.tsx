export const metadata = {
  title: 'daesae',
  description: 'Dynamic Notion renderer'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
