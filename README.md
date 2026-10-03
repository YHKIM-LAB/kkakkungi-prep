# 까꿍이 준비실

부부가 임신 기간의 할 일, 준비물, 일정, 비용을 같은 화면에서 함께 관리하기 위한 모바일 우선 웹서비스입니다. 태명 **까꿍이**와 만나는 날까지 필요한 준비를 주차별로 놓치지 않도록 돕습니다.

현재 버전은 실제 데이터베이스 연결 전 MVP로, 화면과 프로젝트 구조를 검증하기 위한 mock 데이터를 사용합니다.

## 기술 스택

- Next.js (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Supabase JavaScript Client
- ESLint
- Vercel 배포 호환 구조

## 로컬 실행

Node.js 20.9 이상을 권장합니다.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. Supabase 환경변수를 비워 둔 상태에서도 mock UI가 정상 실행됩니다.

프로덕션 검증은 다음 명령으로 할 수 있습니다.

```bash
npm run lint
npm run build
```

## 환경변수

`.env.local.example`을 `.env.local`로 복사한 뒤 Supabase 프로젝트의 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

공개 저장소에는 `.env.local`이나 실제 키를 커밋하지 않습니다. `NEXT_PUBLIC_` 값은 브라우저에 노출될 수 있으므로 반드시 Supabase의 anon/publishable key만 사용해야 합니다.

## Supabase 연결 예정 구조

- `lib/supabase/client.ts`: 브라우저용 Supabase client 생성 함수
- `types/database.ts`: 향후 테이블 Row 타입 및 애플리케이션 도메인 타입
- 예정 테이블: `households`, `household_members`, `pregnancy_profile`, `tasks`, `shopping_items`, `schedules`, `expenses`

환경변수가 없으면 `getSupabaseClient()`는 `null`을 반환하므로 빌드와 mock 화면이 실패하지 않습니다. 실제 연결 단계에서는 Supabase에서 생성한 Database 타입으로 교체하고 Auth, RLS, CRUD를 순서대로 추가할 예정입니다.

## 주요 화면

- `/`: 임신 주차, D-Day, 이번 주 할 일, 다음 일정, 준비 진행률, 구매·비용 요약
- `/tasks`: 할 일 목록
- `/shopping`: 출산·육아 준비물 목록
- `/schedule`: 임신 일정 타임라인
- `/expenses`: 예상 비용과 지출 요약

## 향후 구현 예정

- 부부 초대 및 Supabase Auth
- 가구 단위 데이터 공유와 Row Level Security
- 할 일, 준비물, 일정, 비용 CRUD
- 임신 주차와 D-Day 자동 계산
- 카테고리, 필터, 알림 및 실제 진행률 집계

## 배포

표준 Next.js 애플리케이션 구조이므로 GitHub 저장소를 Vercel에 연결해 배포할 수 있습니다. 배포 시 Vercel 프로젝트 설정에 위 Supabase 환경변수를 추가합니다.
