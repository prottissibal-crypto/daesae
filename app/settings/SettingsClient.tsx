'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from './settings.module.css';

interface AliasRule {
  alias: string;
  notionId: string;
}

interface AliasResponse {
  error?: string;
  rules?: AliasRule[];
  storageMode?: 'browser' | 'file' | 'kv';
}

const storageLabels = {
  browser: '이 브라우저만',
  file: '내 PC 저장',
  kv: '모두에게 적용됨'
};

export default function SettingsClient() {
  const [alias, setAlias] = useState('');
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [notionId, setNotionId] = useState('');
  const [query, setQuery] = useState('');
  const [rules, setRules] = useState<AliasRule[]>([]);
  const [storageMode, setStorageMode] = useState<AliasResponse['storageMode']>();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const loadRules = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/aliases', {
        cache: 'no-store'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setMessage('목록을 못 불러왔어요.');
        return;
      }

      setRules(data.rules || []);
      setStorageMode(data.storageMode);
    } catch {
      setMessage('목록을 못 불러왔어요.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const resetForm = () => {
    setAlias('');
    setEditingAlias(null);
    setNotionId('');
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

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
        setMessage('짧은 주소나 노션 ID를 확인해 주세요.');
        return;
      }

      setRules(data.rules || []);
      setStorageMode(data.storageMode);
      setMessage(editingAlias ? '수정됐어요.' : '저장됐어요.');
      resetForm();
    } catch {
      setMessage(editingAlias ? '수정하지 못했어요.' : '저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const onEdit = (rule: AliasRule) => {
    setAlias(rule.alias);
    setEditingAlias(rule.alias);
    setNotionId(rule.notionId);
    setMessage(`${rule.alias} 수정 중이에요.`);
  };

  const onCopy = async (url: string, ruleAlias: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(`${ruleAlias} 링크를 복사했어요.`);
    } catch {
      setMessage('복사하지 못했어요.');
    }
  };

  const onDelete = async (ruleAlias: string) => {
    setMessage('');

    try {
      const response = await fetch(`/api/aliases?alias=${encodeURIComponent(ruleAlias)}`, {
        method: 'DELETE'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setMessage('삭제하지 못했어요.');
        return;
      }

      setRules(data.rules || []);
      setStorageMode(data.storageMode);
      setMessage('삭제됐어요.');

      if (editingAlias === ruleAlias) {
        resetForm();
      }
    } catch {
      setMessage('삭제하지 못했어요.');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>대세영어학원</p>
            <h1>짧은 주소 만들기</h1>
          </div>
          <a className={styles.homeLink} href="/">
            홈
          </a>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
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
            <button className={styles.primaryButton} disabled={isSaving} type="submit">
              {isSaving ? '저장 중' : editingAlias ? '수정 저장' : '저장'}
            </button>
            {editingAlias && (
              <button className={styles.textButton} onClick={resetForm} type="button">
                취소
              </button>
            )}
          </div>
        </form>

        <div className={styles.statusBar}>
          <span>{storageMode ? storageLabels[storageMode] : '확인 중'}</span>
          <button className={styles.textButton} onClick={loadRules} type="button">
            새로고침
          </button>
          {message && <strong>{message}</strong>}
        </div>

        {storageMode === 'browser' && (
          <p className={styles.warning}>지금은 이 브라우저에서만 저장돼요.</p>
        )}

        <div className={styles.listHeader}>
          <h2>만든 주소</h2>
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
          {isLoading ? (
            <p className={styles.empty}>불러오는 중이에요.</p>
          ) : filteredRules.length ? (
            filteredRules.map((rule) => {
              const ruleUrl = `${origin}/${rule.alias}`;

              return (
                <article className={styles.rule} key={rule.alias}>
                  <div className={styles.ruleMain}>
                    <h3>{rule.alias}</h3>
                    <a href={`/${rule.alias}`}>{ruleUrl}</a>
                    <p>{rule.notionId}</p>
                  </div>
                  <div className={styles.ruleActions}>
                    <button className={styles.editButton} onClick={() => onEdit(rule)} type="button">
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
                      onClick={() => onDelete(rule.alias)}
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
      </section>
    </main>
  );
}
