export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', padding: '4rem', fontFamily: 'system-ui, sans-serif', color: '#111' }}>
      <h1>daesae Notion Viewer</h1>
      <p>이 페이지는 Notion 페이지 ID 기반 뷰어입니다.</p>
      <p>
        예) <code>/2e59e017f46780079207fd9c324dae6e</code>
      </p>
      <p>Notion page id는 32자리 또는 하이픈 포함 UUID 형식으로 전달할 수 있습니다.</p>
      <p>URL에 id를 넣으면 해당 Notion 페이지를 dynamic fetch 방식으로 렌더링합니다.</p>
    </main>
  );
}
