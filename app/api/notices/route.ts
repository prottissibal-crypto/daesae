import { NextRequest, NextResponse } from 'next/server';
import {
  NOTICE_COOKIE_NAME,
  decodeNoticeCookie,
  encodeNoticeCookie,
  getNoticeList,
  getNoticeStorageMode,
  hasPersistentNoticeStorage,
  normalizeNoticeInput,
  normalizeNoticeId,
  removeNoticeFromList,
  removePersistentNotice,
  upsertNoticeInList,
  upsertPersistentNotice
} from '../../../lib/notices';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest) {
  const notices = await getNoticeList({
    cookieValue: request.cookies.get(NOTICE_COOKIE_NAME)?.value
  });

  return NextResponse.json({
    notices,
    storageMode: getNoticeStorageMode()
  });
}

export async function POST(request: NextRequest) {
  const input = normalizeNoticeInput(await request.json());

  if (!input) {
    return NextResponse.json({ error: 'Notice is invalid' }, { status: 400 });
  }

  if (hasPersistentNoticeStorage()) {
    const notices = await upsertPersistentNotice(input);

    return NextResponse.json({
      notices,
      storageMode: getNoticeStorageMode()
    });
  }

  const browserNotices = decodeNoticeCookie(request.cookies.get(NOTICE_COOKIE_NAME)?.value);
  const nextBrowserNotices = upsertNoticeInList(browserNotices, input);
  const response = NextResponse.json({
    notices: nextBrowserNotices,
    storageMode: getNoticeStorageMode()
  });

  setNoticeCookie(response, nextBrowserNotices);

  return response;
}

export async function DELETE(request: NextRequest) {
  const id = normalizeNoticeId(request.nextUrl.searchParams.get('id') || '');

  if (!id) {
    return NextResponse.json({ error: 'Notice id is invalid' }, { status: 400 });
  }

  if (hasPersistentNoticeStorage()) {
    const notices = await removePersistentNotice(id);
    const browserNotices = removeNoticeFromList(
      decodeNoticeCookie(request.cookies.get(NOTICE_COOKIE_NAME)?.value),
      id
    );
    const response = NextResponse.json({
      notices,
      storageMode: getNoticeStorageMode()
    });

    setNoticeCookie(response, browserNotices);

    return response;
  }

  const nextBrowserNotices = removeNoticeFromList(
    decodeNoticeCookie(request.cookies.get(NOTICE_COOKIE_NAME)?.value),
    id
  );
  const response = NextResponse.json({
    notices: nextBrowserNotices,
    storageMode: getNoticeStorageMode()
  });

  setNoticeCookie(response, nextBrowserNotices);

  return response;
}

function setNoticeCookie(response: NextResponse, notices: Parameters<typeof encodeNoticeCookie>[0]) {
  if (!notices.length) {
    response.cookies.delete(NOTICE_COOKIE_NAME);
    return;
  }

  response.cookies.set(NOTICE_COOKIE_NAME, encodeNoticeCookie(notices), {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}
