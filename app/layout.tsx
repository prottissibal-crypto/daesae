export const metadata = {
  title: 'daesae',
  description: 'Dynamic Notion iframe'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
