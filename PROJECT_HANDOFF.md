# Daesae Project Handoff

Last updated: 2026-05-16 KST

이 문서는 새 PC나 새 Codex 인스턴스에서 바로 이어서 작업하기 위한 인수인계 기록입니다. 민감한 토큰 값은 적지 않았고, 필요한 환경변수 이름과 운영 흐름만 남겼습니다.

## 프로젝트 정체

- 서비스명: 대세영어학원 사이트
- 운영 도메인: https://daesae.kro.kr
- GitHub 원격 저장소: https://github.com/prottissibal-crypto/daesae
- 프레임워크: Next.js 14 App Router
- 핵심 목적: Notion 페이지를 iframe 없이 직접 fetch해서 `react-notion-x`로 렌더링하고, 학원 메인 페이지와 선생님용 운영 도구를 함께 제공

## 주요 라우트

- `/`: 대세영어학원 메인 홈페이지
- `/[id]`: Notion 페이지 렌더링
  - 32자리 Notion page id, 하이픈 포함 UUID, 또는 마지막에 Notion id가 붙은 slug를 인식
  - 예: `/2e59e017f46780079207fd9c324dae6e`
  - 예: `/10-000-Words-Challenge-2e59e017f46780079207fd9c324dae6e`
- `/settings`: 선생님용 공지 및 짧은 주소 관리
- `/help`: 선생님용 사이트 이용 도움말
- `/naver-blog`: 네이버 참고 링크로 보내는 route
- `/api/aliases`: 짧은 주소 API
- `/api/notices`: 공지 API

## 중요한 파일

- `app/[id]/page.tsx`
  - server component
  - `NotionAPI().getPage(id)`로 Notion recordMap fetch
  - `export const dynamic = 'force-dynamic'`
  - alias target page도 일부 미리 fetch해서 linked page preview가 보이도록 병합
  - Notion fetch 실패, 잘못된 id, root block 누락 시 `notFound()`

- `app/[id]/NotionPage.tsx`
  - client component
  - `NotionRenderer`에 `fullPage` 적용
  - Code, Collection, Equation, Modal은 dynamic import
  - collection view tabs, board/table/calendar 보정, calendar fallback renderer 포함
  - 라이트/다크 모드 토글
  - Notion hash anchor 이동 보정
  - 늦게 렌더링되는 hash target은 `MutationObserver`로 감지
  - 깨진 Notion 이미지 fallback 문구 표시

- `lib/notionAliasRules.ts`
  - 짧은 주소 규칙 처리
  - production에서는 Vercel KV/Upstash를 우선 사용
  - local fallback은 `data/notion-aliases.json`
  - 예약어: `_next`, `api`, `settings`, `help`, `naver-blog`, `favicon`, `icon`, `manifest`, `robots`, `sitemap`, `daesae-logo` 등

- `lib/notices.ts`
  - 공지 목록 처리
  - production에서는 Vercel KV/Upstash를 우선 사용
  - local fallback은 `data/notices.json`

- `app/settings/SettingsClient.tsx`
  - 공지 등록/수정/삭제
  - 짧은 주소 등록/수정/삭제
  - 검색, 페이지당 20개 pagination
  - `/help`로 가는 도움말 버튼 포함

- `app/help/page.tsx`
  - 선생님용 기능 안내 페이지
  - 개발 문서가 아니라 실제 운영 사용법 중심

- `app/globals.css`
  - Notion 전체 레이아웃, 모바일 폭, dark mode 보정, DB 가로 스크롤, 이미지 fallback 스타일

- `app/layout.tsx`
  - `react-notion-x`, prism, katex CSS import
  - 사이트 metadata, favicon/logo 설정

- `next.config.mjs`
  - `images.unoptimized: true`
  - remote image hostname `**` 허용

## 현재 저장소와 production 데이터

- local fallback 파일:
  - `data/notion-aliases.json`: 현재 local fallback은 비어 있음
  - `data/notices.json`: 현재 local fallback은 비어 있음
- production API 확인 결과:
  - `/api/aliases`: `H1ABTT -> 2da9a08ae89880669340f01d5c494428`
  - `/api/notices`: 현재 공지 없음
  - storageMode: `kv`

주의: local `data/*.json`은 fallback용이라 production KV와 항상 같지 않을 수 있습니다.

## 환경변수

production Vercel에는 KV 관련 환경변수가 설정되어 있습니다. 값은 GitHub에 올리지 않습니다.

필요한 이름:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`
- `REDIS_URL`

코드는 다음 이름도 fallback으로 인식합니다.

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

local에서 KV 없이도 실행은 됩니다. 이 경우 공지/짧은 주소 저장은 `data/*.json` 파일 fallback을 사용합니다.

## 새 PC에서 시작하기

```powershell
git clone https://github.com/prottissibal-crypto/daesae.git
cd daesae
npm install
npm run dev
```

production build 확인:

```powershell
npm run build
npx tsc --noEmit
```

로컬 production 실행:

```powershell
npm run build
npm run start -- -p 3000
```

배포:

```powershell
git add .
git commit -m "작업 내용"
git push
vercel --prod --yes
```

Git push만 해도 Vercel 연동 상태에 따라 자동 배포될 수 있지만, 지금까지는 변경 후 `vercel --prod --yes`로 production 배포까지 직접 확인했습니다.

## 반드시 지켜야 할 구현 원칙

- App Router만 사용합니다. `pages/` router를 새로 만들지 않습니다.
- Notion 페이지는 iframe/redirect 방식으로 보여주지 않습니다.
- `/[id]`는 dynamic fetch 방식이어야 합니다.
- Notion 렌더링은 `react-notion-x`를 유지합니다.
- `app/[id]/page.tsx`는 server component로 유지합니다.
- 실제 `NotionRenderer`는 `app/[id]/NotionPage.tsx` client component 안에 둡니다.
- Notion id는 하이픈 제거 후 fetch 가능한 형태로 정규화합니다.
- settings/help 같은 실제 route 이름은 alias 예약어에 추가해야 합니다.
- KV 토큰, Vercel 토큰 등 secret은 절대 repo에 커밋하지 않습니다.

## 최근에 고친 핵심 문제들

- Notion hash link가 맨 위로 튀던 문제 수정
- `#blockId`가 늦게 렌더링되는 경우 `MutationObserver`로 재탐색
- DB/card/page link hash target도 찾아서 스크롤
- 상단 헤더/공지 높이를 고려한 anchor offset 보정
- 다크모드에서 검은색 텍스트가 잘 안 보이던 문제 보정
- calendar fallback renderer 추가 및 오늘 날짜 강조
- calendar 처음 진입 시 오늘 날짜가 있는 월로 이동
- board/table/calendar collection data 누락 보정
- 모바일에서 board/calendar/table이 전체 페이지를 밀지 않고 내부 가로 스크롤되도록 보정
- Notion 이미지 로드 실패 시 fallback 표시
- `/settings`에 공지 관리, 짧은 주소 검색, pagination 추가
- `/help` 선생님용 이용 도움말 추가
- favicon/logo metadata 정리

## 회귀 테스트 체크리스트

변경 후 최소한 아래를 확인합니다.

```powershell
npm run build
npx tsc --noEmit
```

브라우저 확인:

- `https://daesae.kro.kr/`
- `https://daesae.kro.kr/settings`
- `https://daesae.kro.kr/help`
- `https://daesae.kro.kr/2e59e017f467808cbb40f2b562af786c`
- `https://daesae.kro.kr/2da9a08ae89881738ed2d32599f90cce`

기능 확인:

- `/api/aliases`가 `storageMode: "kv"`를 반환하는지 확인
- `/api/notices`가 정상 JSON을 반환하는지 확인
- `_next`, `help`, `settings` 같은 예약어 alias 등록이 `400`으로 막히는지 확인
- 모바일 390px 기준 전체 문서 가로 overflow가 없는지 확인
- board/calendar/table은 내부 영역에서만 가로 스크롤되는지 확인
- 잘못된 Notion id는 404 안내 페이지로 가는지 확인
- Notion hash link가 대상 블록/카드 위치로 이동하는지 확인

## 현재 주의할 점

- `/settings`는 선생님용이지만 별도 로그인/비밀번호는 없습니다. 이전 요청으로 비밀번호 기능은 제거된 상태입니다.
- production 저장소는 KV입니다. KV 환경변수가 빠지면 production에서는 browser cookie 모드로 떨어지거나 저장이 제한될 수 있습니다.
- Notion의 최신 기능 중 `react-notion-x`가 지원하지 않는 view나 property는 원본 Notion과 100% 같지 않을 수 있습니다.
- PowerShell에서 한글이 깨져 보일 수 있지만, 파일은 UTF-8입니다. `.editorconfig`를 유지하세요.

## 주요 최근 커밋

- `c374d1f` Add teacher help page
- `b7ee900` Harden settings and Notion rendering
- `5f3aaef` Handle late Notion hash targets
- `c8147ae` Improve Notion hash target handling
- `3a04c9e` Restore Notion hash anchor scrolling
- `a7a60cb` Add site notices management

