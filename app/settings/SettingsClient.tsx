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
  const [notionId, setNotionId] = useState('');
  const [rules, setRules] = useState<AliasRule[]>([]);
  const [storageMode, setStorageMode] = useState<AliasResponse['storageMode']>();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const origin = useMemo(
    () => (typeof window === 'undefined' ? 'https://daesae.kro.kr' : window.location.origin),
    []
  );

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
      setAlias('');
      setNotionId('');
      setMessage('저장됐어요.');
    } catch {
      setMessage('저장하지 못했어요.');
    } finally {
      setIsSaving(false);
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
    } catch {
      setMessage('삭제하지 못했어요.');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Settings</p>
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

          <button className={styles.primaryButton} disabled={isSaving} type="submit">
            {isSaving ? '저장 중' : '저장'}
          </button>
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

        <section className={styles.rules} aria-label="짧은 주소 목록">
          {isLoading ? (
            <p className={styles.empty}>불러오는 중이에요.</p>
          ) : rules.length ? (
            rules.map((rule) => (
              <article className={styles.rule} key={rule.alias}>
                <div>
                  <h2>{rule.alias}</h2>
                  <a href={`/${rule.alias}`}>{`${origin}/${rule.alias}`}</a>
                  <p>{rule.notionId}</p>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={() => onDelete(rule.alias)}
                  type="button"
                >
                  삭제
                </button>
              </article>
            ))
          ) : (
            <p className={styles.empty}>아직 만든 주소가 없어요.</p>
          )}
        </section>
      </section>
    </main>
  );
}
