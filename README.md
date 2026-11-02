# qa-dummy-admin — 실습용 상품 관리 페이지 (로컬 전용)

Supabase `qa_dummy` 스키마의 상품을 조회 · 검색 · 추가 · 삭제한다. 데이터는 전부 가상(실습 전용).

## 구조

```
브라우저 ──/rest/v1/...──▶ Vite 개발 서버(127.0.0.1:5173) ──service_role 키 붙여서──▶ Supabase
```

- 키는 `.env.local` 에만 있고 브라우저 코드에는 들어가지 않는다
- 개발 서버가 키를 붙여 주므로 `npm run dev` 로만 동작한다 (빌드해서 배포하는 용도 아님)
- anon 키에는 권한을 주지 않으므로 외부에서 qa_dummy 에 접근할 수 없다

## 처음 한 번

1. Node.js LTS 설치 — https://nodejs.org
2. Supabase SQL Editor에서 `docs/dummy/supabase/01_schema.sql`, `02_seed.sql` 실행 (아직 안 했다면)
3. 대시보드 Project Settings → API (Data API) → **Exposed schemas** 에 `qa_dummy` 추가
4. SQL Editor에서 `docs/dummy/supabase/04_local_admin_grants.sql` 실행
5. 이 폴더의 `.env.local` 에 프로젝트 URL · anon 키 · service_role 키를 채운다 (Session pooler 주소는 쓰지 않음)
6. 이 폴더에서 패키지 설치

```bash
npm install
```

## 실행

```bash
npm run dev
```

브라우저에서 http://127.0.0.1:5173 열기

## 기능

- 목록: 코드 · 상품명 · 분류 · 원산지 · 용량 · 가격 · 알레르기 태그
- 검색: 상품명 · 코드 · 원산지 글자 검색, 분류 필터, 알레르기 주의(함유 · 라인 공유)만 보기
- 상세: 행을 누르면 오른쪽에 보관 · 알레르기 정보
- 추가: 상품 기본 정보만 추가 (보관 · 알레르기 행은 아직 SQL로 추가)
- 삭제: 보관 · 알레르기 행도 함께 삭제. 질문 · 이슈에서 참조 중인 상품은 DB가 삭제를 막는다

## 자주 나는 오류

| 화면 메시지 | 조치 |
| --- | --- |
| qa_dummy 스키마가 API에 노출되어 있지 않습니다 | 처음 한 번 3번 |
| 권한이 없습니다 | 처음 한 번 4번 |
| 개발 서버에 연결할 수 없습니다 | `npm run dev` 실행 중인지 확인 |
| 질문 또는 이슈에서 이 상품을 참조하고 있어 삭제할 수 없습니다 | 정상 동작. P-0113 · P-0205 · P-0402 · P-0421 이 해당 |
