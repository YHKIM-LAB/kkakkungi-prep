# 까꿍이 준비실

부부가 임신 기간의 할 일, 준비물, 일정, 비용을 같은 화면에서 함께 관리하기 위한 모바일 우선 웹서비스입니다. 태명 **까꿍이**와 만나는 날까지 필요한 준비를 주차별로 놓치지 않도록 돕습니다.

현재 버전은 Supabase Auth와 실제 데이터베이스에 연결되어 있습니다. 가족 공간을 기준으로 할 일, 준비물, 일정, 비용을 공유합니다.

## 기술 스택

- Next.js (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Supabase JavaScript Client
- ESLint
- Vercel 배포 호환 구조

## 로컬 실행

운영 환경과 동일한 Node.js 24.x를 권장합니다.

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

`.env.local`에 아래 Supabase 환경변수를 설정한 뒤 브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 환경변수는 로컬 실행과 production build에 필수이며, 누락 시 서버 클라이언트가 오류를 반환합니다.

프로덕션 검증은 다음 명령으로 할 수 있습니다.

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## 브라우저 E2E

Playwright 테스트는 모바일 준비물 카드와 일정 생성·수정·홈 연동·삭제를 검증합니다. 테스트 계정은 별도 가족 공간에 연결된 계정을 사용하고, 자격증명은 저장소에 커밋하지 않습니다.

```powershell
npm run test:e2e:install
$env:E2E_EMAIL="..."
$env:E2E_PASSWORD="..."
npm run test:e2e
```

배포된 환경을 검사할 때는 `PLAYWRIGHT_BASE_URL`도 지정합니다.

```powershell
$env:PLAYWRIGHT_BASE_URL="https://kkakkungi-prep.vercel.app"
$env:E2E_EMAIL="..."
$env:E2E_PASSWORD="..."
npm run test:e2e
```

운영 환경에서 테스트 데이터를 생성하기 전에는 별도 승인이 필요합니다. 기존 운영 데이터는 수정·삭제하지 않습니다.

일정 CRUD 테스트는 실행마다 고유한 `E2E-YYYYMMDD-...` 접두어 일정 한 건만 만들고, 성공·실패와 관계없이 같은 접두어의 단일 항목만 정리합니다. 대상이 둘 이상이면 기존 데이터 보호를 위해 삭제하지 않고 실패합니다.

## 환경변수

`.env.local.example`을 `.env.local`로 복사한 뒤 Supabase 프로젝트의 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

공개 저장소에는 `.env.local`이나 실제 키를 커밋하지 않습니다. `NEXT_PUBLIC_` 값은 브라우저에 노출될 수 있으므로 반드시 Supabase의 anon/publishable key만 사용해야 합니다.

## Supabase 연결 구조

- `lib/supabase/client.ts`: 브라우저용 클라이언트
- `lib/supabase/server.ts`: 쿠키 기반 서버 클라이언트
- `proxy.ts`, `lib/supabase/proxy.ts`: 세션 갱신 및 인증 경로 보호
- `types/database.generated.ts`: 운영 DB public 스키마에서 생성한 타입. 스키마 변경 후 재생성합니다.
- `types/database.ts`: 생성 타입의 별칭과 앱 입력 선택지 타입
- 테이블: `households`, `household_members`, `pregnancy_profile`, `tasks`, `shopping_items`, `schedules`, `expenses`, `household_invitations`
- `supabase/migrations`: 스키마 및 권한 변경 SQL. 운영 DB와 차이가 있을 수 있으므로 재적용 전 비교가 필요합니다.

## 주요 화면

- `/`: 임신 주차, D-Day, 이번 주 할 일, 다음 일정, 준비 진행률, 구매·비용 요약
- `/tasks`: 할 일 목록
- `/shopping`: 출산·육아 준비물 목록
- `/schedule`: 임신 일정 타임라인
- `/expenses`: 예상 비용과 지출 요약

## 구현된 기능과 검증 범위

- Supabase Auth 로그인, 가족 공간 생성 및 배우자 초대
- 가구 단위 데이터 공유 및 RLS
- 할 일, 준비물, 일정, 비용 CRUD
- 임신 주차와 D-Day 계산, 진행률 및 홈 요약
- 준비물 필터와 구매 링크, 비용 결제 상태 관리

구현 여부와 실제 E2E 검증 통과 여부는 별개입니다. 현재 자동 테스트는 이메일·비밀번호 로그인, 모바일 준비물 카드와 일정 CRUD 중심이며 OAuth, 지출 CRUD, 두 계정 동기화, RLS 전체를 검증하지 않습니다.

준비물 구매액과 비용 장부는 별도로 집계합니다. 두 계정 간 변경 사항 자동 수신을 위한 Realtime 구독과 알림은 아직 구현되어 있지 않습니다.

## 배포

표준 Next.js 애플리케이션 구조이므로 GitHub 저장소를 Vercel에 연결해 배포할 수 있습니다. 배포 시 Vercel 프로젝트 설정에 위 Supabase 환경변수를 추가합니다.

GitHub main에 push하면 연결된 Vercel Production 배포가 시작될 수 있습니다. 운영 변경 승인을 받은 뒤 push합니다.
