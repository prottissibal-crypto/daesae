import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export const NOTICE_COOKIE_NAME = 'daesae_notices';

const NOTICE_STORE_KEY = 'daesae:notices';
const NOTICE_FILE_PATH = path.join(process.cwd(), 'data', 'notices.json');

export interface Notice {
  body: string;
  createdAt: string;
  enabled: boolean;
  id: string;
  title: string;
  updatedAt: string;
}

export interface NoticeInput {
  body: string;
  enabled?: boolean;
  id?: string;
  title: string;
}

interface NoticeOptions {
  cookieValue?: string;
}

interface UpstashConfig {
  token: string;
  url: string;
}

export function normalizeNoticeId(value: string) {
  const id = value.trim();

  return /^[A-Za-z0-9_-]{8,80}$/.test(id) ? id : null;
}

export function normalizeNoticeInput(value: unknown): NoticeInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const id = typeof payload.id === 'string' ? normalizeNoticeId(payload.id) : undefined;

  if (!title || title.length > 80 || !body || body.length > 500) {
    return null;
  }

  return {
    body,
    enabled: payload.enabled !== false,
    id: id || undefined,
    title
  };
}

export async function getNoticeList(options: NoticeOptions = {}) {
  return mergeNoticeLists(
    await getReadableStoredNoticeList(),
    decodeNoticeCookie(options.cookieValue)
  );
}

export async function getActiveNoticeList(options: NoticeOptions = {}) {
  return (await getNoticeList(options)).filter((notice) => notice.enabled);
}

export async function upsertPersistentNotice(input: NoticeInput) {
  const currentNotices = await getStoredNoticeList();
  const nextNotices = upsertNoticeInList(currentNotices, input);

  await writeStoredNoticeList(nextNotices);

  return nextNotices;
}

export async function removePersistentNotice(id: string) {
  const normalizedId = normalizeNoticeId(id);

  if (!normalizedId) {
    throw new Error('Invalid notice id');
  }

  const nextNotices = (await getStoredNoticeList()).filter((notice) => notice.id !== normalizedId);

  await writeStoredNoticeList(nextNotices);

  return nextNotices;
}

export function upsertNoticeInList(notices: Notice[], input: NoticeInput) {
  const normalizedInput = normalizeNoticeInput(input);

  if (!normalizedInput) {
    throw new Error('Invalid notice');
  }

  const now = new Date().toISOString();
  const existingIndex = normalizedInput.id
    ? notices.findIndex((notice) => notice.id === normalizedInput.id)
    : -1;
  const existingNotice = existingIndex >= 0 ? notices[existingIndex] : undefined;
  const nextNotice: Notice = {
    body: normalizedInput.body,
    createdAt: existingNotice?.createdAt || now,
    enabled: normalizedInput.enabled !== false,
    id: normalizedInput.id || randomUUID(),
    title: normalizedInput.title,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    return normalizeNoticeList(
      notices.map((notice, index) => (index === existingIndex ? nextNotice : notice))
    );
  }

  return normalizeNoticeList([nextNotice, ...notices]);
}

export function removeNoticeFromList(notices: Notice[], id: string) {
  const normalizedId = normalizeNoticeId(id);

  if (!normalizedId) {
    throw new Error('Invalid notice id');
  }

  return normalizeNoticeList(notices.filter((notice) => notice.id !== normalizedId));
}

export function getNoticeStorageMode() {
  if (getUpstashConfig()) {
    return 'kv';
  }

  return process.env.VERCEL ? 'browser' : 'file';
}

export function hasPersistentNoticeStorage() {
  return getNoticeStorageMode() !== 'browser';
}

export function decodeNoticeCookie(value?: string) {
  if (!value) {
    return [];
  }

  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    return normalizeNoticeList(JSON.parse(json));
  } catch {
    return [];
  }
}

export function encodeNoticeCookie(notices: Notice[]) {
  return Buffer.from(JSON.stringify(normalizeNoticeList(notices)), 'utf8').toString('base64url');
}

function normalizeNoticeList(value: unknown): Notice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const notices: Notice[] = [];
  const ids = new Set<string>();

  for (const rawNotice of value) {
    if (!rawNotice || typeof rawNotice !== 'object' || Array.isArray(rawNotice)) {
      continue;
    }

    const notice = rawNotice as Record<string, unknown>;
    const id = typeof notice.id === 'string' ? normalizeNoticeId(notice.id) : null;
    const title = typeof notice.title === 'string' ? notice.title.trim() : '';
    const body = typeof notice.body === 'string' ? notice.body.trim() : '';
    const createdAt = typeof notice.createdAt === 'string' ? notice.createdAt : '';
    const updatedAt = typeof notice.updatedAt === 'string' ? notice.updatedAt : createdAt;

    if (!id || ids.has(id) || !title || title.length > 80 || !body || body.length > 500) {
      continue;
    }

    ids.add(id);
    notices.push({
      body,
      createdAt: createdAt || updatedAt || new Date().toISOString(),
      enabled: notice.enabled !== false,
      id,
      title,
      updatedAt: updatedAt || createdAt || new Date().toISOString()
    });
  }

  return notices.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mergeNoticeLists(...noticeLists: Notice[][]) {
  const noticeMap = new Map<string, Notice>();

  for (const notices of noticeLists) {
    for (const notice of normalizeNoticeList(notices)) {
      noticeMap.set(notice.id, notice);
    }
  }

  return normalizeNoticeList(Array.from(noticeMap.values()));
}

async function getStoredNoticeList() {
  const upstash = getUpstashConfig();

  if (upstash) {
    return readUpstashNoticeList(upstash);
  }

  return readFileNoticeList();
}

async function getReadableStoredNoticeList() {
  try {
    return await getStoredNoticeList();
  } catch (error) {
    console.warn('Notice storage read failed', error);
    return [];
  }
}

async function writeStoredNoticeList(notices: Notice[]) {
  const upstash = getUpstashConfig();

  if (upstash) {
    await writeUpstashNoticeList(upstash, notices);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error('Persistent notice storage is not configured');
  }

  await mkdir(path.dirname(NOTICE_FILE_PATH), { recursive: true });
  await writeFile(NOTICE_FILE_PATH, `${JSON.stringify(normalizeNoticeList(notices), null, 2)}\n`);
}

async function readFileNoticeList() {
  try {
    const raw = await readFile(NOTICE_FILE_PATH, 'utf8');
    return normalizeNoticeList(JSON.parse(raw));
  } catch {
    return [];
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

async function readUpstashNoticeList(config: UpstashConfig) {
  const response = await fetch(`${config.url}/get/${encodeURIComponent(NOTICE_STORE_KEY)}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to read notices');
  }

  const data = (await response.json()) as { result?: string | null };

  if (!data.result) {
    return [];
  }

  return normalizeNoticeList(JSON.parse(data.result));
}

async function writeUpstashNoticeList(config: UpstashConfig, notices: Notice[]) {
  const response = await fetch(`${config.url}/set/${encodeURIComponent(NOTICE_STORE_KEY)}`, {
    body: JSON.stringify(normalizeNoticeList(notices)),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'text/plain'
    },
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Failed to write notices');
  }
}
