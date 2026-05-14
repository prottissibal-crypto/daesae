'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from './settings.module.css';

interface AliasRule {
  alias: string;
  notionId: string;
}

interface Notice {
  body: string;
  createdAt: string;
  enabled: boolean;
  id: string;
  title: string;
  updatedAt: string;
}

interface AliasResponse {
  error?: string;
  rules?: AliasRule[];
  storageMode?: StorageMode;
}

interface NoticeResponse {
  error?: string;
  notices?: Notice[];
  storageMode?: StorageMode;
}

type StorageMode = 'browser' | 'file' | 'kv';

const storageLabels: Record<StorageMode, string> = {
  browser: '이 브라우저만',
  file: '내 PC 저장',
  kv: '모두에게 적용됨'
};
const ALIAS_PAGE_SIZE = 20;

export default function SettingsClient() {
  const [alias, setAlias] = useState('');
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [notionId, setNotionId] = useState('');
  const [query, setQuery] = useState('');
  const [aliasPage, setAliasPage] = useState(1);
  const [rules, setRules] = useState<AliasRule[]>([]);
  const [aliasStorageMode, setAliasStorageMode] = useState<StorageMode>();
  const [aliasMessage, setAliasMessage] = useState('');
  const [isAliasLoading, setIsAliasLoading] = useState(true);
  const [isAliasSaving, setIsAliasSaving] = useState(false);

  const [noticeBody, setNoticeBody] = useState('');
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeStorageMode, setNoticeStorageMode] = useState<StorageMode>();
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  const [isNoticeSaving, setIsNoticeSaving] = useState(false);

  const origin = useMemo(
    () => (typeof window === 'undefined' ? 'https://daesae.kro.kr' : window.location.origin),
    []
  );
  const filteredRules = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return rules;
    }

    return rules.filter((rule) =>
      [rule.alias, rule.notionId, `${origin}/${rule.alias}`].some((value) =>
        value.toLowerCase().includes(search)
      )
    );
  }, [origin, query, rules]);
  const aliasPageCount = Math.max(1, Math.ceil(filteredRules.length / ALIAS_PAGE_SIZE));
  const pagedRules = useMemo(() => {
    const startIndex = (aliasPage - 1) * ALIAS_PAGE_SIZE;

    return filteredRules.slice(startIndex, startIndex + ALIAS_PAGE_SIZE);
  }, [aliasPage, filteredRules]);
  const aliasFirstIndex = filteredRules.length ? (aliasPage - 1) * ALIAS_PAGE_SIZE + 1 : 0;
  const aliasLastIndex = Math.min(aliasPage * ALIAS_PAGE_SIZE, filteredRules.length);

  const loadRules = async () => {
    setIsAliasLoading(true);
    setAliasMessage('');

    try {
      const response = await fetch('/api/aliases', {
        cache: 'no-store'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setAliasMessage('목록을 못 불러왔어요.');
        return;
      }

      setRules(data.rules || []);
      setAliasStorageMode(data.storageMode);
    } catch {
      setAliasMessage('목록을 못 불러왔어요.');
    } finally {
      setIsAliasLoading(false);
    }
  };

  const loadNotices = async () => {
    setIsNoticeLoading(true);
    setNoticeMessage('');

    try {
      const response = await fetch('/api/notices', {
        cache: 'no-store'
      });
      const data = (await response.json()) as NoticeResponse;

      if (!response.ok) {
        setNoticeMessage('공지 목록을 못 불러왔어요.');
        return;
      }

      setNotices(data.notices || []);
      setNoticeStorageMode(data.storageMode);
    } catch {
      setNoticeMessage('공지 목록을 못 불러왔어요.');
    } finally {
      setIsNoticeLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
    void loadNotices();
  }, []);

  useEffect(() => {
    setAliasPage(1);
  }, [query]);

  useEffect(() => {
    setAliasPage((currentPage) => Math.min(currentPage, aliasPageCount));
  }, [aliasPageCount]);

  const resetAliasForm = () => {
    setAlias('');
    setEditingAlias(null);
    setNotionId('');
  };

  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeBody('');
    setNoticeEnabled(true);
    setNoticeTitle('');
  };

  const onAliasSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAliasSaving(true);
    setAliasMessage('');

    try {
      const response = await fetch('/api/aliases', {
        body: JSON.stringify({ alias, notionId }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setAliasMessage('짧은 주소나 노션 ID를 확인해 주세요.');
        return;
      }

      setRules(data.rules || []);
      setAliasStorageMode(data.storageMode);
      setAliasMessage(editingAlias ? '수정됐어요.' : '저장됐어요.');
      resetAliasForm();
    } catch {
      setAliasMessage(editingAlias ? '수정하지 못했어요.' : '저장하지 못했어요.');
    } finally {
      setIsAliasSaving(false);
    }
  };

  const onNoticeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsNoticeSaving(true);
    setNoticeMessage('');

    try {
      const response = await fetch('/api/notices', {
        body: JSON.stringify({
          body: noticeBody,
          enabled: noticeEnabled,
          id: editingNoticeId || undefined,
          title: noticeTitle
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });
      const data = (await response.json()) as NoticeResponse;

      if (!response.ok) {
        setNoticeMessage('공지 제목과 내용을 확인해 주세요.');
        return;
      }

      setNotices(data.notices || []);
      setNoticeStorageMode(data.storageMode);
      setNoticeMessage(editingNoticeId ? '공지 수정됐어요.' : '공지 등록됐어요.');
      resetNoticeForm();
    } catch {
      setNoticeMessage(editingNoticeId ? '공지 수정에 실패했어요.' : '공지 등록에 실패했어요.');
    } finally {
      setIsNoticeSaving(false);
    }
  };

  const onEditAlias = (rule: AliasRule) => {
    setAlias(rule.alias);
    setEditingAlias(rule.alias);
    setNotionId(rule.notionId);
    setAliasMessage(`${rule.alias} 수정 중이에요.`);
  };

  const onEditNotice = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNoticeBody(notice.body);
    setNoticeEnabled(notice.enabled);
    setNoticeTitle(notice.title);
    setNoticeMessage('공지 수정 중이에요.');
  };

  const onCopy = async (url: string, ruleAlias: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setAliasMessage(`${ruleAlias} 링크를 복사했어요.`);
    } catch {
      setAliasMessage('복사하지 못했어요.');
    }
  };

  const onDeleteAlias = async (ruleAlias: string) => {
    setAliasMessage('');

    try {
      const response = await fetch(`/api/aliases?alias=${encodeURIComponent(ruleAlias)}`, {
        method: 'DELETE'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setAliasMessage('삭제하지 못했어요.');
        return;
      }

      setRules(data.rules || []);
      setAliasStorageMode(data.storageMode);
      setAliasMessage('삭제됐어요.');

      if (editingAlias === ruleAlias) {
        resetAliasForm();
      }
    } catch {
      setAliasMessage('삭제하지 못했어요.');
    }
  };

  const onDeleteNotice = async (noticeId: string) => {
    setNoticeMessage('');

    try {
      const response = await fetch(`/api/notices?id=${encodeURIComponent(noticeId)}`, {
        method: 'DELETE'
      });
      const data = (await response.json()) as NoticeResponse;

      if (!response.ok) {
        setNoticeMessage('공지 삭제에 실패했어요.');
        return;
      }

      setNotices(data.notices || []);
      setNoticeStorageMode(data.storageMode);
      setNoticeMessage('공지 삭제됐어요.');

      if (editingNoticeId === noticeId) {
        resetNoticeForm();
      }
    } catch {
      setNoticeMessage('공지 삭제에 실패했어요.');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>대세영어학원</p>
            <h1>사이트 설정</h1>
          </div>
          <a className={styles.homeLink} href="/">
            홈
          </a>
        </header>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>공지</h2>
              <p>등록한 공지는 학생 Notion 페이지 상단에 공통으로 표시돼요.</p>
            </div>
          </div>

          <form className={`${styles.form} ${styles.noticeForm}`} onSubmit={onNoticeSubmit}>
            <label className={styles.field}>
              <span>공지 제목</span>
              <input
                maxLength={80}
                onChange={(event) => setNoticeTitle(event.target.value)}
                placeholder="설 연휴 안내"
                required
                value={noticeTitle}
              />
            </label>

            <label className={styles.field}>
              <span>공지 내용</span>
              <textarea
                maxLength={500}
                onChange={(event) => setNoticeBody(event.target.value)}
                placeholder="2월 16일 - 18일은 설 연휴입니다."
                required
                rows={4}
                value={noticeBody}
              />
            </label>

            <label className={styles.checkboxField}>
              <input
                checked={noticeEnabled}
                onChange={(event) => setNoticeEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>학생 페이지에 표시</span>
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} disabled={isNoticeSaving} type="submit">
                {isNoticeSaving ? '저장 중' : editingNoticeId ? '공지 수정' : '공지 등록'}
              </button>
              {editingNoticeId && (
                <button className={styles.textButton} onClick={resetNoticeForm} type="button">
                  취소
                </button>
              )}
            </div>
          </form>

          <div className={styles.statusBar}>
            <span>{noticeStorageMode ? storageLabels[noticeStorageMode] : '확인 중'}</span>
            <button className={styles.textButton} onClick={loadNotices} type="button">
              새로고침
            </button>
            {noticeMessage && <strong>{noticeMessage}</strong>}
          </div>

          {noticeStorageMode === 'browser' && (
            <p className={styles.warning}>지금은 이 브라우저에서만 공지가 보여요.</p>
          )}

          <section className={styles.rules} aria-label="공지 목록">
            {isNoticeLoading ? (
              <p className={styles.empty}>공지 불러오는 중이에요.</p>
            ) : notices.length ? (
              notices.map((notice) => (
                <article className={styles.rule} key={notice.id}>
                  <div className={styles.ruleMain}>
                    <div className={styles.noticeTitleRow}>
                      <h4>{notice.title}</h4>
                      <span className={notice.enabled ? styles.badgeActive : styles.badgeMuted}>
                        {notice.enabled ? '표시 중' : '숨김'}
                      </span>
                    </div>
                    <p className={styles.noticeBody}>{notice.body}</p>
                    <p>마지막 수정: {formatDate(notice.updatedAt)}</p>
                  </div>
                  <div className={styles.ruleActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => onEditNotice(notice)}
                      type="button"
                    >
                      수정
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDeleteNotice(notice.id)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className={styles.empty}>아직 등록한 공지가 없어요.</p>
            )}
          </section>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>짧은 주소</h2>
              <p>학생에게 배포할 Notion 페이지 주소를 쉽게 바꿔요.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={onAliasSubmit}>
            <label className={styles.field}>
              <span>짧은 주소</span>
              <input
                autoCapitalize="characters"
                disabled={Boolean(editingAlias)}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="H1ABTT"
                required
                value={alias}
              />
            </label>

            <label className={styles.field}>
              <span>노션 ID</span>
              <input
                onChange={(event) => setNotionId(event.target.value)}
                placeholder="2e59e017f46780079207fd9c324dae6e"
                required
                value={notionId}
              />
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} disabled={isAliasSaving} type="submit">
                {isAliasSaving ? '저장 중' : editingAlias ? '수정 저장' : '저장'}
              </button>
              {editingAlias && (
                <button className={styles.textButton} onClick={resetAliasForm} type="button">
                  취소
                </button>
              )}
            </div>
          </form>

          <div className={styles.statusBar}>
            <span>{aliasStorageMode ? storageLabels[aliasStorageMode] : '확인 중'}</span>
            <button className={styles.textButton} onClick={loadRules} type="button">
              새로고침
            </button>
            {aliasMessage && <strong>{aliasMessage}</strong>}
          </div>

          {aliasStorageMode === 'browser' && (
            <p className={styles.warning}>지금은 이 브라우저에서만 저장돼요.</p>
          )}

          <div className={styles.listHeader}>
            <h3>만든 주소</h3>
            <label className={styles.searchField}>
              <span>검색</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="H1ABTT"
                type="search"
                value={query}
              />
            </label>
          </div>

          <section className={styles.rules} aria-label="짧은 주소 목록">
            {isAliasLoading ? (
              <p className={styles.empty}>불러오는 중이에요.</p>
            ) : filteredRules.length ? (
              pagedRules.map((rule) => {
                const ruleUrl = `${origin}/${rule.alias}`;

                return (
                  <article className={styles.rule} key={rule.alias}>
                    <div className={styles.ruleMain}>
                      <h4>{rule.alias}</h4>
                      <a href={`/${rule.alias}`}>{ruleUrl}</a>
                      <p>{rule.notionId}</p>
                    </div>
                    <div className={styles.ruleActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => onEditAlias(rule)}
                        type="button"
                      >
                        수정
                      </button>
                      <button
                        className={styles.copyButton}
                        onClick={() => onCopy(ruleUrl, rule.alias)}
                        type="button"
                      >
                        링크 복사
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => onDeleteAlias(rule.alias)}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className={styles.empty}>
                {query.trim() ? '검색 결과가 없어요.' : '아직 만든 주소가 없어요.'}
              </p>
            )}
          </section>

          {!isAliasLoading && filteredRules.length > ALIAS_PAGE_SIZE && (
            <nav className={styles.pagination} aria-label="짧은 주소 페이지">
              <span>
                {aliasFirstIndex}-{aliasLastIndex} / {filteredRules.length}
              </span>
              <div className={styles.paginationActions}>
                <button
                  className={styles.textButton}
                  disabled={aliasPage <= 1}
                  onClick={() => setAliasPage((currentPage) => Math.max(1, currentPage - 1))}
                  type="button"
                >
                  이전
                </button>
                <strong>
                  {aliasPage} / {aliasPageCount}
                </strong>
                <button
                  className={styles.textButton}
                  disabled={aliasPage >= aliasPageCount}
                  onClick={() =>
                    setAliasPage((currentPage) => Math.min(aliasPageCount, currentPage + 1))
                  }
                  type="button"
                >
                  다음
                </button>
              </div>
            </nav>
          )}
        </section>

      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
