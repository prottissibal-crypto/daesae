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
  browser: '브라우저 임시 저장',
  file: '파일 저장',
  kv: '공용 KV 저장'
};

export default function SettingsClient() {
  const [alias, setAlias] = useState('');
  const [notionId, setNotionId] = useState('');
  const [password, setPassword] = useState('');
  const [rules, setRules] = useState<AliasRule[]>([]);
  const [storageMode, setStorageMode] = useState<AliasResponse['storageMode']>();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const origin = useMemo(
    () => (typeof window === 'undefined' ? 'https://daesae.kro.kr' : window.location.origin),
    []
  );

  const requestHeaders = useMemo(() => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (password) {
      headers['x-settings-password'] = password;
    }

    return headers;
  }, [password]);

  const loadRules = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/aliases', {
        cache: 'no-store',
        headers: password ? { 'x-settings-password': password } : undefined
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setMessage(response.status === 401 ? '설정 비밀번호를 입력해 주세요.' : '규칙을 불러오지 못했습니다.');
        return;
      }

      setRules(data.rules || []);
      setStorageMode(data.storageMode);
    } catch {
      setMessage('규칙을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/aliases', {
        body: JSON.stringify({ alias, notionId }),
        headers: requestHeaders,
        method: 'POST'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setMessage(response.status === 401 ? '설정 비밀번호가 맞지 않습니다.' : '규칙 또는 Notion ID를 확인해 주세요.');
        return;
      }

      setRules(data.rules || []);
      setStorageMode(data.storageMode);
      setAlias('');
      setNotionId('');
      setMessage('규칙이 저장되었습니다.');
    } catch {
      setMessage('규칙을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (ruleAlias: string) => {
    setMessage('');

    try {
      const response = await fetch(`/api/aliases?alias=${encodeURIComponent(ruleAlias)}`, {
        headers: password ? { 'x-settings-password': password } : undefined,
        method: 'DELETE'
      });
      const data = (await response.json()) as AliasResponse;

      if (!response.ok) {
        setMessage(response.status === 401 ? '설정 비밀번호가 맞지 않습니다.' : '규칙을 삭제하지 못했습니다.');
        return;
      }

      setRules(data.rules || []);
      setStorageMode(data.storageMode);
      setMessage('규칙이 삭제되었습니다.');
    } catch {
      setMessage('규칙을 삭제하지 못했습니다.');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Daesae Settings</p>
            <h1>주소 규칙 관리</h1>
          </div>
          <a className={styles.homeLink} href="/">
            홈
          </a>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>설정 비밀번호</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="설정된 경우에만 입력"
              type="password"
              value={password}
            />
          </label>
          <button className={styles.secondaryButton} onClick={loadRules} type="button">
            불러오기
          </button>

          <label className={styles.field}>
            <span>규칙</span>
            <input
              autoCapitalize="characters"
              onChange={(event) => setAlias(event.target.value)}
              placeholder="H1ABTT"
              required
              value={alias}
            />
          </label>

          <label className={styles.field}>
            <span>Notion page id</span>
            <input
              onChange={(event) => setNotionId(event.target.value)}
              placeholder="2e59e017f46780079207fd9c324dae6e"
              required
              value={notionId}
            />
          </label>

          <button className={styles.primaryButton} disabled={isSaving} type="submit">
            {isSaving ? '저장 중' : '규칙 저장'}
          </button>
        </form>

        <div className={styles.statusBar}>
          <span>{storageMode ? storageLabels[storageMode] : '저장 방식 확인 중'}</span>
          {message && <strong>{message}</strong>}
        </div>

        {storageMode === 'browser' && (
          <p className={styles.warning}>
            공용 저장소가 연결되지 않아 이 브라우저에서만 규칙이 적용됩니다.
          </p>
        )}

        <section className={styles.rules} aria-label="등록된 주소 규칙">
          {isLoading ? (
            <p className={styles.empty}>불러오는 중입니다.</p>
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
            <p className={styles.empty}>등록된 규칙이 없습니다.</p>
          )}
        </section>
      </section>
    </main>
  );
}
