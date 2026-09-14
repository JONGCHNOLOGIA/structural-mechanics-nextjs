-- Supabase SQL Editor에 그대로 붙여넣고 실행하면 됨
-- (이전에 대화로 설계했던 DB 구조를 그대로 SQL로 옮긴 것)

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','instructor')),
  display_name text,
  student_id text unique,
  created_at timestamptz default now()
);

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

-- AI 튜터 대화 원문 (학생 본인 열람 + 교수자 리포트 재료)
create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

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

-- RLS(Row Level Security): 각자 자기 데이터만 보게
alter table profiles enable row level security;
alter table user_progress enable row level security;
alter table chat_logs enable row level security;
alter table site_content enable row level security;

create policy "본인 프로필만 조회/수정" on profiles
  for all using (auth.uid() = id);

create policy "본인 진도만 조회/수정" on user_progress
  for all using (auth.uid() = user_id);

create policy "본인 대화만 조회, 본인 이름으로만 작성" on chat_logs
  for select using (auth.uid() = user_id);
create policy "본인 이름으로 대화 작성" on chat_logs
  for insert with check (auth.uid() = user_id);

-- site_content: 문구는 누구나 읽을 수 있지만, 수정은 특정 학번(22011031) 계정만 가능.
-- role='instructor' 전체로 허용하면 "관리자로 시연" 데모 계정도 실제 문구를 고칠 수 있게 되므로
-- role이 아니라 student_id로 딱 한 명만 지정함.
create policy "누구나 문구 조회 가능" on site_content
  for select using (true);
create policy "지정된 학번만 문구 등록" on site_content
  for insert with check (exists (select 1 from profiles where id = auth.uid() and student_id = '22011031'));
create policy "지정된 학번만 문구 수정" on site_content
  for update using (exists (select 1 from profiles where id = auth.uid() and student_id = '22011031'))
  with check (exists (select 1 from profiles where id = auth.uid() and student_id = '22011031'));

-- 교수자는 role 컬럼을 보고 별도 정책/뷰로 익명 열람 처리 (필요시 추가)
