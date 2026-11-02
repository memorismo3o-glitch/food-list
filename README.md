# qa-dummy-admin — 실습용 상품 관리 페이지

Supabase(public 스키마)의 상품을 조회 · 검색 · 추가 · 삭제한다. 데이터는 전부 가상(실습 전용).

## 구조

```
로컬:   브라우저 ──/api/rest/v1/...──▶ Vite 개발 서버(127.0.0.1:5173) ──service_role 키──▶ Supabase
Vercel: 브라우저 ──/api/rest/v1/...──▶ 서버 함수 api/rest/v1/[table].js (비밀번호 확인) ──service_role 키──▶ Supabase
```

- 키는 `.env.local`(로컬) · Vercel 환경 변수(배포)에만 있고 브라우저 코드에는 들어가지 않는다
- 배포 서버 함수는 `ADMIN_PASSWORD` 를 맞힌 요청만, `products` 테이블의 조회 · 추가 · 삭제만 통과시킨다
- 테이블은 RLS를 켜 두고 정책을 만들지 않았으므로 anon 키로는 읽거나 쓸 수 없다 (RLS를 끄지 말 것)

## 처음 한 번

1. Node.js LTS 설치 — https://nodejs.org
2. Supabase SQL Editor에서 `docs/dummy/supabase/01_schema.sql`, `02_seed.sql` 실행 (아직 안 했다면)
3. 이 폴더의 `.env.local` 에 프로젝트 URL · anon 키 · service_role 키를 채운다 (Session pooler 주소는 쓰지 않음)
4. 이 폴더에서 패키지 설치

```bash
npm install
```

## 실행

```bash
npm run dev
```

브라우저에서 http://127.0.0.1:5173 열기

## Vercel 배포

1. Framework Preset: **Vite** (Build Command · Output Directory 는 기본값 그대로)
2. Settings → Environment Variables 에 3개 추가 후 다시 배포 (Redeploy)

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 |
| `ADMIN_PASSWORD` | 화면에 들어갈 때 입력할 비밀번호 (직접 정함) |

- 환경 변수가 하나라도 없으면 서버 함수가 모든 요청을 거절한다 (잠긴 상태로 시작)
- 처음 접속하면 비밀번호 입력창이 뜬다. 입력값은 탭을 닫으면 사라진다

## 기능

- 목록: 코드 · 상품명 · 분류 · 원산지 · 용량 · 가격 · 알레르기 태그
- 검색: 상품명 · 코드 · 원산지 글자 검색, 분류 필터, 알레르기 주의(함유 · 라인 공유)만 보기
- 상세: 행을 누르면 오른쪽에 보관 · 알레르기 정보
- 추가: 상품 기본 정보만 추가 (보관 · 알레르기 행은 아직 SQL로 추가)
- 삭제: 보관 · 알레르기 행도 함께 삭제. 질문 · 이슈에서 참조 중인 상품은 DB가 삭제를 막는다

## 자주 나는 오류

| 화면 메시지 | 조치 |
| --- | --- |
| 상품 테이블이 없습니다 | 처음 한 번 2번 |
| 권한이 없습니다 | `.env.local` · Vercel 환경 변수의 키가 service_role 키인지 확인 |
| 서버에 연결할 수 없습니다 | 로컬이면 `npm run dev` 실행 중인지 확인 |
| Vercel 환경 변수 … 를 설정한 뒤 다시 배포하세요 | Vercel 배포 2번 |
| 관리 비밀번호가 맞지 않습니다 | 새로고침 후 비밀번호 다시 입력 |
| 질문 또는 이슈에서 이 상품을 참조하고 있어 삭제할 수 없습니다 | 정상 동작. P-0113 · P-0205 · P-0402 · P-0421 이 해당 |
