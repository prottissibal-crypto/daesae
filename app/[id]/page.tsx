import type { ExtendedRecordMap } from 'notion-types';
import { NotionAPI } from 'notion-client';
import { getBlockValue } from 'notion-utils';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ALIAS_COOKIE_NAME, resolveNotionPageIdFromPath } from '../../lib/notionAliasRules';
import { NOTICE_COOKIE_NAME, getActiveNoticeList, type Notice } from '../../lib/notices';
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

type RecordMapWithAssets = ExtendedRecordMap & {
  custom_emoji?: Record<string, unknown>;
  team?: Record<string, unknown>;
};

interface CustomEmoji {
  url?: string;
}

async function fetchNotionPage(id: string): Promise<ExtendedRecordMap> {
  const notion = new NotionAPI();
  const recordMap = await notion.getPage(id);

  await resolveAliasTargets(recordMap, notion);
  normalizeCustomEmojiImages(recordMap);

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

  const targetRecordMap = recordMap as RecordMapWithAssets;
  const sourceRecordMapWithAssets = sourceRecordMap as RecordMapWithAssets;

  targetRecordMap.custom_emoji = {
    ...sourceRecordMapWithAssets.custom_emoji,
    ...targetRecordMap.custom_emoji
  };
  targetRecordMap.team = {
    ...sourceRecordMapWithAssets.team,
    ...targetRecordMap.team
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

function normalizeCustomEmojiImages(recordMap: ExtendedRecordMap) {
  for (const blockBox of Object.values(recordMap.block || {})) {
    const block = getBlockValue(blockBox);
    const blockFormat = block?.format as { page_icon?: string } | undefined;
    const pageIcon = blockFormat?.page_icon;

    if (blockFormat && typeof pageIcon === 'string') {
      blockFormat.page_icon = resolveCustomEmojiUrl(pageIcon, recordMap);
    }
  }

  for (const collectionBox of Object.values(recordMap.collection || {})) {
    const collection = getNotionMapValue<{ icon?: string }>(collectionBox);

    if (typeof collection?.icon === 'string') {
      collection.icon = resolveCustomEmojiUrl(collection.icon, recordMap);
    }
  }
}

function resolveCustomEmojiUrl(value: string, recordMap: ExtendedRecordMap) {
  if (!value.startsWith('notion://custom_emoji/')) {
    return value;
  }

  const emojiId = value.split('/').pop();
  const emoji = getCustomEmoji(recordMap, emojiId);

  return emoji?.url || value;
}

function getCustomEmoji(recordMap: ExtendedRecordMap, emojiId?: string) {
  if (!emojiId) {
    return undefined;
  }

  const customEmojiMap = (recordMap as RecordMapWithAssets).custom_emoji || {};
  const normalizedEmojiId = emojiId.replace(/-/g, '').toLowerCase();
  const mapKey = Object.keys(customEmojiMap).find(
    (key) => key.replace(/-/g, '').toLowerCase() === normalizedEmojiId
  );

  return mapKey ? getNotionMapValue<CustomEmoji>(customEmojiMap[mapKey]) : undefined;
}

function getNotionMapValue<T>(box: unknown): T | undefined {
  if (!box || typeof box !== 'object' || !('value' in box)) {
    return undefined;
  }

  const value = (box as { value?: unknown }).value;

  if (value && typeof value === 'object' && 'value' in value) {
    return (value as { value?: T }).value;
  }

  return value as T;
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
    notFound();
  }

  let notices: Notice[] = [];

  try {
    notices = await getActiveNoticeList({
      cookieValue: cookies().get(NOTICE_COOKIE_NAME)?.value
    });
  } catch (error) {
    console.warn('Notice fetch failed', error);
  }

  let recordMap: ExtendedRecordMap;

  try {
    recordMap = await fetchNotionPage(notionId);
  } catch (error) {
    console.warn('Notion page fetch failed', notionId, error);
    notFound();
  }

  const rootPageId = getRecordMapBlockId(recordMap, notionId);

  if (!rootPageId) {
    notFound();
  }

  return (
    <main style={{ minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <NotionPage
        initialCollectionViewId={initialCollectionViewId}
        notices={notices}
        recordMap={recordMap}
        rootPageId={rootPageId}
      />
    </main>
  );
}
