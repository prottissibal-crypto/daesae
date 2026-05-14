import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export const ALIAS_COOKIE_NAME = 'daesae_alias_rules';

const ALIAS_STORE_KEY = 'daesae:notion-aliases';
const ALIAS_FILE_PATH = path.join(process.cwd(), 'data', 'notion-aliases.json');
const RESERVED_ALIASES = new Set(['api', 'naver-blog', 'settings']);
const NOTION_PAGE_ID_AT_END =
  /([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export type AliasRuleMap = Record<string, string>;

interface AliasRuleOptions {
  cookieValue?: string;
}

interface UpstashConfig {
  token: string;
  url: string;
}

export function normalizeNotionPageId(value: string) {
  const match = value.trim().match(NOTION_PAGE_ID_AT_END);
  const id = (match ? match[1] : value.trim()).replace(/-/g, '');

  return /^[0-9a-fA-F]{32}$/.test(id) ? id.toLowerCase() : null;
}

export function getNotionPageIdFromSlug(slug: string) {
  return normalizeNotionPageId(slug);
}

export function normalizeAlias(value: string) {
  const alias = value.trim().replace(/^\/+|\/+$/g, '');

  if (!/^[A-Za-z0-9_-]{2,64}$/.test(alias)) {
    return null;
  }

  if (normalizeNotionPageId(alias)) {
    return null;
  }

  const normalizedAlias = alias.toUpperCase();

  return RESERVED_ALIASES.has(normalizedAlias.toLowerCase()) ? null : normalizedAlias;
}

export async function resolveNotionPageIdFromPath(pathValue: string, options: AliasRuleOptions = {}) {
  const notionId = getNotionPageIdFromSlug(pathValue);

  if (notionId) {
    return notionId;
  }

  const alias = normalizeAlias(pathValue);

  if (!alias) {
    return null;
  }

  const rules = await getAliasRuleMap(options);

  return rules[alias] || null;
}

export async function getAliasRuleMap(options: AliasRuleOptions = {}) {
  return normalizeAliasRuleMap({
    ...getEnvAliasRuleMap(),
    ...(await getStoredAliasRuleMap()),
    ...decodeAliasCookie(options.cookieValue)
  });
}

export async function upsertPersistentAliasRule(alias: string, notionId: string) {
  const normalizedAlias = normalizeAlias(alias);
  const normalizedNotionId = normalizeNotionPageId(notionId);

  if (!normalizedAlias || !normalizedNotionId) {
    throw new Error('Invalid alias rule');
  }

  const currentRules = await getStoredAliasRuleMap();
  const nextRules = normalizeAliasRuleMap({
    ...currentRules,
    [normalizedAlias]: normalizedNotionId
  });

  await writeStoredAliasRuleMap(nextRules);

  return nextRules;
}

export async function removePersistentAliasRule(alias: string) {
  const normalizedAlias = normalizeAlias(alias);

  if (!normalizedAlias) {
    throw new Error('Invalid alias rule');
  }

  const currentRules = await getStoredAliasRuleMap();
  delete currentRules[normalizedAlias];

  const nextRules = normalizeAliasRuleMap(currentRules);
  await writeStoredAliasRuleMap(nextRules);

  return nextRules;
}

export function getAliasStorageMode() {
  if (getUpstashConfig()) {
    return 'kv';
  }

  return process.env.VERCEL ? 'browser' : 'file';
}

export function hasPersistentAliasStorage() {
  return getAliasStorageMode() !== 'browser';
}

export function decodeAliasCookie(value?: string) {
  if (!value) {
    return {};
  }

  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    return normalizeAliasRuleMap(JSON.parse(json));
  } catch {
    return {};
  }
}

export function encodeAliasCookie(rules: AliasRuleMap) {
  return Buffer.from(JSON.stringify(normalizeAliasRuleMap(rules)), 'utf8').toString('base64url');
}

export function toAliasRuleList(rules: AliasRuleMap) {
  return Object.entries(normalizeAliasRuleMap(rules))
    .map(([alias, notionId]) => ({ alias, notionId }))
    .sort((a, b) => a.alias.localeCompare(b.alias));
}

export function mergeAliasRules(...ruleMaps: AliasRuleMap[]) {
  return normalizeAliasRuleMap(Object.assign({}, ...ruleMaps));
}

function normalizeAliasRuleMap(value: unknown): AliasRuleMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const rules: AliasRuleMap = {};

  for (const [rawAlias, rawNotionId] of Object.entries(value)) {
    const alias = normalizeAlias(rawAlias);
    const notionId = typeof rawNotionId === 'string' ? normalizeNotionPageId(rawNotionId) : null;

    if (alias && notionId) {
      rules[alias] = notionId;
    }
  }

  return rules;
}

function getEnvAliasRuleMap() {
  const raw = process.env.NOTION_ALIASES;

  if (!raw) {
    return {};
  }

  try {
    return normalizeAliasRuleMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function getStoredAliasRuleMap() {
  const upstash = getUpstashConfig();

  if (upstash) {
    return readUpstashAliasRuleMap(upstash);
  }

  return readFileAliasRuleMap();
}

async function writeStoredAliasRuleMap(rules: AliasRuleMap) {
  const upstash = getUpstashConfig();

  if (upstash) {
    await writeUpstashAliasRuleMap(upstash, rules);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error('Persistent alias storage is not configured');
  }

  await mkdir(path.dirname(ALIAS_FILE_PATH), { recursive: true });
  await writeFile(ALIAS_FILE_PATH, `${JSON.stringify(normalizeAliasRuleMap(rules), null, 2)}\n`);
}

async function readFileAliasRuleMap() {
  try {
    const raw = await readFile(ALIAS_FILE_PATH, 'utf8');
    return normalizeAliasRuleMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return {
    token,
    url: url.replace(/\/+$/, '')
  };
}

async function readUpstashAliasRuleMap(config: UpstashConfig) {
  const response = await fetch(`${config.url}/get/${encodeURIComponent(ALIAS_STORE_KEY)}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to read alias rules');
  }

  const data = (await response.json()) as { result?: string | null };

  if (!data.result) {
    return {};
  }

  return normalizeAliasRuleMap(JSON.parse(data.result));
}

async function writeUpstashAliasRuleMap(config: UpstashConfig, rules: AliasRuleMap) {
  const response = await fetch(`${config.url}/set/${encodeURIComponent(ALIAS_STORE_KEY)}`, {
    body: JSON.stringify(normalizeAliasRuleMap(rules)),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'text/plain'
    },
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Failed to write alias rules');
  }
}
