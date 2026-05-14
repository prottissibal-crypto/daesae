import { NextRequest, NextResponse } from 'next/server';
import {
  ALIAS_COOKIE_NAME,
  decodeAliasCookie,
  encodeAliasCookie,
  getAliasRuleMap,
  getAliasStorageMode,
  hasPersistentAliasStorage,
  mergeAliasRules,
  normalizeAlias,
  normalizeNotionPageId,
  removePersistentAliasRule,
  toAliasRuleList,
  upsertPersistentAliasRule
} from '../../../lib/notionAliasRules';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface AliasPayload {
  alias?: unknown;
  notionId?: unknown;
}

export async function GET(request: NextRequest) {
  const rules = await getAliasRuleMap({
    cookieValue: request.cookies.get(ALIAS_COOKIE_NAME)?.value
  });

  return NextResponse.json({
    rules: toAliasRuleList(rules),
    storageMode: getAliasStorageMode()
  });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as AliasPayload;
  const alias = typeof payload.alias === 'string' ? normalizeAlias(payload.alias) : null;
  const notionId =
    typeof payload.notionId === 'string' ? normalizeNotionPageId(payload.notionId) : null;

  if (!alias || !notionId) {
    return NextResponse.json(
      { error: 'Alias or Notion page id is invalid' },
      { status: 400 }
    );
  }

  if (hasPersistentAliasStorage()) {
    const storedRules = await upsertPersistentAliasRule(alias, notionId);
    const rules = mergeAliasRules(
      await getAliasRuleMap({
        cookieValue: request.cookies.get(ALIAS_COOKIE_NAME)?.value
      }),
      storedRules
    );

    return NextResponse.json({
      rules: toAliasRuleList(rules),
      storageMode: getAliasStorageMode()
    });
  }

  const browserRules = decodeAliasCookie(request.cookies.get(ALIAS_COOKIE_NAME)?.value);
  const nextBrowserRules = mergeAliasRules(browserRules, { [alias]: notionId });
  const allRules = mergeAliasRules(await getAliasRuleMap(), nextBrowserRules);
  const response = NextResponse.json({
    rules: toAliasRuleList(allRules),
    storageMode: getAliasStorageMode()
  });

  setAliasCookie(response, nextBrowserRules);

  return response;
}

export async function DELETE(request: NextRequest) {
  const alias = normalizeAlias(request.nextUrl.searchParams.get('alias') || '');

  if (!alias) {
    return NextResponse.json({ error: 'Alias is invalid' }, { status: 400 });
  }

  if (hasPersistentAliasStorage()) {
    const storedRules = await removePersistentAliasRule(alias);
    const browserRules = decodeAliasCookie(request.cookies.get(ALIAS_COOKIE_NAME)?.value);
    delete browserRules[alias];
    const rules = mergeAliasRules(
      await getAliasRuleMap({
        cookieValue: encodeAliasCookie(browserRules)
      }),
      storedRules
    );
    const response = NextResponse.json({
      rules: toAliasRuleList(rules),
      storageMode: getAliasStorageMode()
    });

    setAliasCookie(response, browserRules);

    return response;
  }

  const browserRules = decodeAliasCookie(request.cookies.get(ALIAS_COOKIE_NAME)?.value);
  delete browserRules[alias];

  const allRules = mergeAliasRules(await getAliasRuleMap(), browserRules);
  const response = NextResponse.json({
    rules: toAliasRuleList(allRules),
    storageMode: getAliasStorageMode()
  });

  setAliasCookie(response, browserRules);

  return response;
}

function setAliasCookie(response: NextResponse, rules: Record<string, string>) {
  const normalizedRules = mergeAliasRules(rules);

  if (!Object.keys(normalizedRules).length) {
    response.cookies.delete(ALIAS_COOKIE_NAME);
    return;
  }

  response.cookies.set(ALIAS_COOKIE_NAME, encodeAliasCookie(normalizedRules), {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}
