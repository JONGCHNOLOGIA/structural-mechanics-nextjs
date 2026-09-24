-- Supabase SQL Editor에 그대로 붙여넣고 실행하면 됨
-- (이전에 대화로 설계했던 DB 구조를 그대로 SQL로 옮긴 것)

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','instructor')),
  display_name text,
  student_id text unique,
  decimals int not null default 3, -- 계산 결과 표시 소수점 자리수 (설정 버튼에서 저장)
  created_at timestamptz default now()
);

-- 기존에 만들어진 profiles 테이블에는 decimals 컬럼이 없을 수 있어서 안전하게 추가
alter table profiles add column if not exists decimals int not null default 3;

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  "order" int not null,
  title text not null,
  content_summary text
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters(id) on delete cascade,
  "order" int not null,
  slug text not null,           -- 예: 'composite-beams'
  name text not null,           -- 예: 'Composite Beams'
  description text
);

-- 사용자 입력값(마지막 슬라이더/블록 구성 등)을 그대로 JSON으로 저장 → 재접속 시 복원
create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  last_input_state jsonb,
  updated_at timestamptz default now(),
  unique(user_id, topic_id)
);

-- AI 튜터 대화 원문 (학생 본인 열람 + 교수자 통계 재료).
-- topic_id는 예전 설계(topics 테이블) 흔적인데 그 테이블을 실제로 안 써서, topic_visits/
-- problem_attempts와 똑같이 chapter_num 문자열(lib/chapters1.js·lib/chapters.js의 num,
-- 예: 'CH.3')로 식별한다. topic_id는 지우지 않고 그냥 안 쓰는 채로 둔다.
create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  chapter_num text,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
-- 이미 만들어져 있던 chat_logs에는 chapter_num 컬럼이 없을 수 있어서 안전하게 추가
alter table chat_logs add column if not exists chapter_num text;

-- 교수자용 AI 분석 리포트 캐시 (매번 새로 만들지 않도록)
create table if not exists topic_reports (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  generated_at timestamptz default now(),
  summary_content text
);

-- 사이트 곳곳의 소소한 설명 문구를 코드 수정 없이 교수자(관리자) 계정으로 직접 고칠 수 있게 하는 테이블.
-- key: EditableText contentKey (예: 'home.hero.description'), value: 화면에 보일 실제 텍스트.
create table if not exists site_content (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- 홈 화면 "이어서 학습하기"용: 소주제를 들어갈 때마다 방문 시각을 기록 (챕터/소주제는
-- lib/chapters.js의 num/slug 문자열로 식별 — topics 테이블은 실제로는 쓰지 않아서 그대로 둠).
create table if not exists topic_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  chapter_num text not null,
  subtopic_slug text not null,
  visited_at timestamptz not null default now(),
  unique (user_id, chapter_num, subtopic_slug)
);

-- 문제 생성기에서 "정답 확인" 후 본인이 맞았는지/틀렸는지 스스로 표시한 기록.
-- 홈 화면의 "문제 풀이 %"와 "오답 횟수", "최근 틀린 개념"의 근거 데이터로 씀.
create table if not exists problem_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  chapter_num text not null,
  subtopic_slug text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

-- 문제 제작 허브 "문제 다시보기"에서 그때 그 문제/풀이사진/AI 튜터 설명까지 그대로 다시 볼 수
-- 있도록, "정답 확인" 시점에 있던 문제 지문·정답·도형·AI 채점 결과까지 같이 저장한다.
-- (기존 행들은 이 컬럼들이 전부 null — 이 기능 이전 기록이라 다시보기에서 "저장된 정보 없음"으로 처리)
alter table problem_attempts add column if not exists prompt text;
alter table problem_attempts add column if not exists answers jsonb;
alter table problem_attempts add column if not exists diagram jsonb;
alter table problem_attempts add column if not exists ai_feedback text;
alter table problem_attempts add column if not exists solution_image_path text;

-- RLS(Row Level Security): 각자 자기 데이터만 보게
alter table profiles enable row level security;
alter table user_progress enable row level security;
alter table chat_logs enable row level security;
alter table site_content enable row level security;
alter table topic_visits enable row level security;
alter table problem_attempts enable row level security;

-- subjects/chapters/topics/topic_reports는 앱에서 실제로 쓰지 않는 테이블(예전 설계 흔적)이라
-- 정책 없이 RLS만 켜서 anon/authenticated 키로 아무도 접근 못 하게 막아둠.
alter table subjects enable row level security;
alter table chapters enable row level security;
alter table topics enable row level security;
alter table topic_reports enable row level security;

-- 정책(policy)은 create if not exists가 없어서, 이 파일을 여러 번 통째로 다시 실행해도
-- 에러 없이 안전하게 돌아가도록 매번 drop policy if exists로 먼저 지우고 다시 만듦.
drop policy if exists "본인 방문기록만 조회/작성" on topic_visits;
create policy "본인 방문기록만 조회/작성" on topic_visits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "본인 풀이기록만 조회/작성" on problem_attempts;
create policy "본인 풀이기록만 조회/작성" on problem_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "본인 프로필만 조회/수정" on profiles;
create policy "본인 프로필만 조회/수정" on profiles
  for all using (auth.uid() = id);

drop policy if exists "본인 진도만 조회/수정" on user_progress;
create policy "본인 진도만 조회/수정" on user_progress
  for all using (auth.uid() = user_id);

drop policy if exists "본인 대화만 조회, 본인 이름으로만 작성" on chat_logs;
create policy "본인 대화만 조회, 본인 이름으로만 작성" on chat_logs
  for select using (auth.uid() = user_id);
drop policy if exists "본인 이름으로 대화 작성" on chat_logs;
create policy "본인 이름으로 대화 작성" on chat_logs
  for insert with check (auth.uid() = user_id);

-- 교수자(관리자) 통계 페이지용 — role='instructor'면 다른 학생들의 기록도 전체 조회 가능.
-- 같은 테이블에 SELECT 정책이 여러 개면 OR로 합쳐지므로, 학생 본인용 정책은 그대로 둔 채
-- "전체 열람" 정책만 추가하는 방식이다(하나를 고쳐 쓰는 게 아니라 나란히 놓는다).
--
-- ⚠️ profiles를 조회하는 정책을 profiles 테이블 자체에 "select ... from profiles" 서브쿼리로
-- 직접 걸면(바로 아래 profiles 정책이 처음에 이렇게 돼 있었음), Postgres가 그 정책을 평가하려고
-- profiles를 다시 읽다가 또 같은 정책을 평가해야 해서 "infinite recursion detected in policy"
-- 에러가 나고, 이게 profiles에 대한 모든 쿼리(로그인 시 프로필 조회 포함)를 다 막아버린다
-- (실제로 이 버그로 로그인/로그아웃이 막혔었다). SECURITY DEFINER 함수로 감싸면 함수 안에서는
-- RLS를 안 타므로 이 문제가 없다 — Supabase 공식 문서가 권장하는 해결 패턴.
create or replace function public.is_instructor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'instructor');
$$;

drop policy if exists "교수자는 전체 대화 조회 가능" on chat_logs;
create policy "교수자는 전체 대화 조회 가능" on chat_logs
  for select using (public.is_instructor());

drop policy if exists "교수자는 전체 방문기록 조회 가능" on topic_visits;
create policy "교수자는 전체 방문기록 조회 가능" on topic_visits
  for select using (public.is_instructor());

drop policy if exists "교수자는 전체 풀이기록 조회 가능" on problem_attempts;
create policy "교수자는 전체 풀이기록 조회 가능" on problem_attempts
  for select using (public.is_instructor());

-- 통계 화면에서 방문 학생 수 막대에 마우스를 올리면 학번을 보여주기 위해, 교수자는
-- 다른 학생들의 profiles 행(학번)도 조회할 수 있게 한다.
drop policy if exists "교수자는 전체 프로필(학번) 조회 가능" on profiles;
create policy "교수자는 전체 프로필(학번) 조회 가능" on profiles
  for select using (public.is_instructor());

-- site_content: 문구는 누구나 읽을 수 있지만, 수정은 정해진 학번(22011031, demo-admin)만 가능.
-- role='instructor' 전체로 허용하면 관계없는 instructor 계정도 실제 문구를 고칠 수 있게 되므로
-- role이 아니라 student_id 화이트리스트로 지정함. demo-admin은 로그인 화면의
-- "관리자로 시연" 데모 버튼 계정 — 발표 중 문구 수정 시연이 가능해야 해서 포함.
drop policy if exists "누구나 문구 조회 가능" on site_content;
create policy "누구나 문구 조회 가능" on site_content
  for select using (true);
drop policy if exists "지정된 학번만 문구 등록" on site_content;
create policy "지정된 학번만 문구 등록" on site_content
  for insert with check (exists (select 1 from profiles where id = auth.uid() and student_id in ('22011031', 'demo-admin')));
drop policy if exists "지정된 학번만 문구 수정" on site_content;
create policy "지정된 학번만 문구 수정" on site_content
  for update using (exists (select 1 from profiles where id = auth.uid() and student_id in ('22011031', 'demo-admin')))
  with check (exists (select 1 from profiles where id = auth.uid() and student_id in ('22011031', 'demo-admin')));

-- 교수자 전체 열람 정책은 위 chat_logs/topic_visits/problem_attempts 섹션에 각각 추가해뒀음.

-- SECTIONS 목록에서 소주제에 마우스를 올리면 보여줄 미리보기 이미지 저장용 버킷.
-- 파일 자체는 여기 버킷에, 실제 URL은 site_content 테이블에 키(subtopic.CH.6.composite-beams.image.1)로 저장함.
insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

drop policy if exists "누구나 미리보기 이미지 조회 가능" on storage.objects;
create policy "누구나 미리보기 이미지 조회 가능" on storage.objects
  for select using (bucket_id = 'content-images');

drop policy if exists "지정된 학번만 미리보기 이미지 업로드" on storage.objects;
create policy "지정된 학번만 미리보기 이미지 업로드" on storage.objects
  for insert with check (
    bucket_id = 'content-images'
    and exists (select 1 from profiles where id = auth.uid() and student_id in ('22011031', 'demo-admin'))
  );

drop policy if exists "지정된 학번만 미리보기 이미지 수정" on storage.objects;
create policy "지정된 학번만 미리보기 이미지 수정" on storage.objects
  for update using (
    bucket_id = 'content-images'
    and exists (select 1 from profiles where id = auth.uid() and student_id in ('22011031', 'demo-admin'))
  );

drop policy if exists "지정된 학번만 미리보기 이미지 삭제" on storage.objects;
create policy "지정된 학번만 미리보기 이미지 삭제" on storage.objects
  for delete using (
    bucket_id = 'content-images'
    and exists (select 1 from profiles where id = auth.uid() and student_id in ('22011031', 'demo-admin'))
  );

-- "문제 다시보기"에서 같이 보여줄 학생 풀이 사진 저장용 버킷. content-images(누구나 조회 가능한
-- 미리보기 이미지)와 달리 이건 개인 풀이 사진이라 비공개(public:false)로 만들고, 파일 경로를
-- `${user_id}/파일명`으로 강제해서 본인 폴더에만 넣고 본인 폴더만 읽게 한다(교수자는 전체 조회).
insert into storage.buckets (id, name, public)
values ('solution-images', 'solution-images', false)
on conflict (id) do nothing;

drop policy if exists "본인 폴더에만 풀이 사진 업로드" on storage.objects;
create policy "본인 폴더에만 풀이 사진 업로드" on storage.objects
  for insert with check (
    bucket_id = 'solution-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "본인 풀이 사진만 조회, 교수자는 전체 조회" on storage.objects;
create policy "본인 풀이 사진만 조회, 교수자는 전체 조회" on storage.objects
  for select using (
    bucket_id = 'solution-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_instructor())
  );
