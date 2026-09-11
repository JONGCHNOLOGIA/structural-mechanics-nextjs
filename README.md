# 구조역학 2 — Next.js + Supabase 마이그레이션 뼈대

프로토타입(HTML 데모)을 실제 사이트로 옮기기 시작한 프로젝트입니다.

## 실행 방법

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 (Supabase 프로젝트 만들고 URL/키 복사)
npm run dev
```

브라우저에서 http://localhost:3000 접속.

## Supabase 설정

1. https://supabase.com 에서 새 프로젝트 생성
2. Project Settings → API 에서 URL, anon key 복사 → `.env.local`에 붙여넣기
3. SQL Editor에 `supabase/schema.sql` 내용 그대로 붙여넣고 실행 → 테이블 자동 생성
4. Authentication → Sign In / Providers 에서 "Allow anonymous sign-ins" 활성화 (공모전 시연용: 이메일/비밀번호 없이 이름만 입력하면 익명 계정 생성 + DB 저장)

## 폴더 구조

```
app/
  page.js                              → 홈 (챕터/소주제 목록, 아직 자리만 잡아둠)
  login/page.js                        → 로그인 (Supabase 매직링크, 완성)
  subjects/structural-mechanics-2/ch6/
    composite-beams/page.js            → Composite Beams 페이지 (완성)
components/
  calculators/
    CompositeBeams.jsx                 → Composite Beams 계산기 (완성, 포팅 패턴 참고용)
lib/
  supabaseClient.js                    → Supabase 클라이언트 (완성)
  calc/
    unitOptions.js                     → 단위 변환 테이블, fmt/fmtSci, 색상 팔레트 (완성, 프로토타입과 100% 동일한 값)
    compositeBeams.js                  → 순수 계산 함수 computeComposite() (완성, 프로토타입과 로직 동일)
supabase/
  schema.sql                           → DB 테이블 정의 (완성)
```

## 지금까지 포팅된 것

- ✅ Composite Beams 계산기 전체 (블록 추가/삭제, 값 수정, 단면+응력 다이어그램, 기본 결과 표시)
- ✅ 로그인 (Supabase 익명 인증 + 이름 입력, 공모전 시연용)
- ✅ DB 스키마
- ✅ 단위 변환/포맷 유틸리티

## 아직 안 된 것 (프로토타입 HTML 파일 참고해서 이어서 포팅하면 됨)

우선순위 순서대로:

1. **홈 화면** (`app/page.js`) — 프로토타입의 `chapters` 배열 + 챕터/소주제 카드 UI
2. **나머지 11개 계산기** (Transformed Section, FGM, Inclined Loads, Elastoplastic, Plane Stress, Mohr's Circle,
   Hooke's Law, 압력용기 2개, Beam Stress, Combined Loadings) — `CompositeBeams.jsx`와 똑같은 패턴으로 만들면 됨:
   1. `lib/calc/`에 순수 계산 함수 옮기기 (프로토타입의 `xxCompute()` 함수를 거의 그대로)
   2. `components/calculators/`에 React 컴포넌트 만들기 (`useState`로 입력값 관리)
3. **Composite Beams의 나머지 기능**: 블록 드래그 순서 변경, 샌드위치 On/Off 토글, 툴팁, y기준점 토글
   → `CompositeBeams.jsx` 상단 주석에 뭐가 빠졌는지 적어뒀어요
4. **AI 튜터 실제 연결** — `app/api/tutor/route.js` 서버 라우트 만들어서 Claude API 호출
   (지금 계산된 값들을 컨텍스트로 넘기면 됨). API 키는 서버 라우트에서만 사용하고
   `NEXT_PUBLIC_` 접두어 절대 붙이지 말 것 (붙이면 브라우저에 노출됨)
5. **진도 저장** — `user_progress` 테이블에 `last_input_state`를 주기적으로 저장/복원
6. **교수자 리포트** — `chat_logs`를 모아서 AI에게 분석 요청 → `topic_reports`에 캐싱

## 포팅할 때 팁

프로토타입 HTML 파일에서 각 계산기의 로직은 `xxCompute()` 함수 하나에 다 들어있어요.
그 함수를 찾아서 `lib/calc/`에 그대로 복사하고, `cb.xxx`처럼 전역 상태를 참조하던 부분만
함수 인자로 받도록 바꾸면 끝이에요 (`CompositeBeams.jsx`에서 한 것과 동일한 패턴).
화면 그리는 부분(`render...()` 함수)은 `CompositeBeams.jsx`를 템플릿 삼아서
같은 구조(Setting Menu / Visualizer / AI Tutor 3분할)로 옮기면 됩니다.
