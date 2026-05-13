import type { ExtendedRecordMap } from 'notion-types';
import { NotionAPI } from 'notion-client';
import NotionPage from './NotionPage';

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

async function fetchNotionPage(id: string): Promise<ExtendedRecordMap> {
  const notion = new NotionAPI();
  return notion.getPage(id);
}

export default async function Page({ params }: { params: Params }) {
  const notionId = params.id.replace(/-/g, '');

  if (!/^[0-9a-fA-F]{32}$/.test(notionId)) {
    return (
      <main style={{ minHeight: '100vh', padding: '4rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>잘못된 Notion page id입니다.</h1>
        <p>URL 경로에 32자리 Notion id 또는 하이픈 포함 UUID를 입력해 주세요.</p>
      </main>
    );
  }

  const recordMap = await fetchNotionPage(notionId);

  return (
    <main style={{ minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <NotionPage recordMap={recordMap} />
    </main>
  );
}
