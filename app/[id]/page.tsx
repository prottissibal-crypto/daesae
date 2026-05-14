import type { ExtendedRecordMap } from 'notion-types';
import { NotionAPI } from 'notion-client';
import { getBlockValue } from 'notion-utils';
import { cookies } from 'next/headers';
import { ALIAS_COOKIE_NAME, resolveNotionPageIdFromPath } from '../../lib/notionAliasRules';
import NotionPage from './NotionPage';

export const dynamic = 'force-dynamic';

const MAX_ALIAS_RESOLVE_DEPTH = 2;
const MAX_ALIAS_TARGETS_PER_DEPTH = 20;

interface Params {
  id: string;
}

interface SearchParams {
  v?: string | string[];
}

async function fetchNotionPage(id: string): Promise<ExtendedRecordMap> {
  const notion = new NotionAPI();
  const recordMap = await notion.getPage(id);

  await resolveAliasTargets(recordMap, notion);

  return recordMap;
}

async function resolveAliasTargets(recordMap: ExtendedRecordMap, notion: NotionAPI) {
  const fetchedPageIds = new Set<string>();

  for (let depth = 0; depth < MAX_ALIAS_RESOLVE_DEPTH; depth += 1) {
    const targetIds = getMissingAliasTargetIds(recordMap)
      .filter((targetId) => !fetchedPageIds.has(targetId))
      .slice(0, MAX_ALIAS_TARGETS_PER_DEPTH);

    if (!targetIds.length) {
      break;
    }

    const targetRecordMaps = await Promise.all(
      targetIds.map(async (targetId) => {
        fetchedPageIds.add(targetId);

        try {
          return await notion.getPage(targetId);
        } catch (error) {
          console.warn('Notion alias target fetch failed', targetId, error);
          return null;
        }
      })
    );

    let didMerge = false;

    for (const targetRecordMap of targetRecordMaps) {
      if (!targetRecordMap) continue;

      mergeRecordMaps(recordMap, targetRecordMap);
      didMerge = true;
    }

    if (!didMerge) {
      break;
    }
  }
}

function getMissingAliasTargetIds(recordMap: ExtendedRecordMap) {
  const targetIds = new Set<string>();

  for (const blockBox of Object.values(recordMap.block || {})) {
    const block = getBlockValue(blockBox);

    if (block?.type !== 'alias') continue;

    const targetId = block.format?.alias_pointer?.id;

    if (targetId && !recordMap.block[targetId]) {
      targetIds.add(targetId);
    }
  }

  return Array.from(targetIds);
}

function mergeRecordMaps(recordMap: ExtendedRecordMap, sourceRecordMap: ExtendedRecordMap) {
  recordMap.block = {
    ...sourceRecordMap.block,
    ...recordMap.block
  };
  recordMap.collection = {
    ...sourceRecordMap.collection,
    ...recordMap.collection
  };
  recordMap.collection_view = {
    ...sourceRecordMap.collection_view,
    ...recordMap.collection_view
  };
  recordMap.notion_user = {
    ...sourceRecordMap.notion_user,
    ...recordMap.notion_user
  };
  recordMap.signed_urls = {
    ...sourceRecordMap.signed_urls,
    ...recordMap.signed_urls
  };

  for (const [collectionId, sourceCollectionQuery] of Object.entries(
    sourceRecordMap.collection_query || {}
  )) {
    recordMap.collection_query[collectionId] = {
      ...sourceCollectionQuery,
      ...recordMap.collection_query[collectionId]
    };
  }
}

function getSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getRecordMapBlockId(recordMap: ExtendedRecordMap, pageId: string) {
  const normalizedPageId = pageId.replace(/-/g, '').toLowerCase();

  return Object.keys(recordMap.block).find(
    (blockId) => blockId.replace(/-/g, '').toLowerCase() === normalizedPageId
  );
}

export default async function Page({
  params,
  searchParams
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const notionId = await resolveNotionPageIdFromPath(params.id, {
    cookieValue: cookies().get(ALIAS_COOKIE_NAME)?.value
  });
  const initialCollectionViewId = getSearchParamValue(searchParams?.v);

  if (!notionId) {
    return (
      <main style={{ minHeight: '100vh', padding: '4rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>잘못된 Notion page id입니다.</h1>
        <p>URL 끝에 32자리 Notion id, 하이픈 포함 UUID, 또는 등록된 규칙을 넣어 주세요.</p>
      </main>
    );
  }

  const recordMap = await fetchNotionPage(notionId);
  const rootPageId = getRecordMapBlockId(recordMap, notionId) || notionId;

  return (
    <main style={{ minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <NotionPage
        initialCollectionViewId={initialCollectionViewId}
        recordMap={recordMap}
        rootPageId={rootPageId}
      />
    </main>
  );
}
