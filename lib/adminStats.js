import { supabase } from '@/lib/supabaseClient';

// 교수자 통계 화면(app/admin/stats)의 데이터 레이어. topic_visits/problem_attempts/chat_logs는
// 원래 "본인 기록만" 보이게 RLS가 걸려 있는데, supabase/schema.sql에 role='instructor'면
// 전체를 볼 수 있는 정책을 추가해뒀다 — 그래서 여기 쿼리에는 .eq('user_id', ...) 같은 필터가
// 없다(계정이 instructor가 아니면 RLS가 알아서 빈 배열만 돌려준다).
//
// 집계는 Postgres 쪽에 뷰/RPC를 새로 만들지 않고, 원본 행을 그대로 가져와 여기서 JS로 묶는다 —
// 강의 규모(학생 수백 명 단위)에서는 이 정도로 충분하고, lib/progress.js의 fetchProgressSummary()와
// 같은 방식이라 유지보수 부담도 적다.

// 소주제별 오답률 — "어떤 유형을 어려워하는지"의 직접적인 근거.
// minAttempts 미만으로 시도된 소주제는 표본이 너무 작아 순위에서 뺀다.
export async function fetchWrongRateBySubtopic(minAttempts = 3) {
  const { data, error } = await supabase.from('problem_attempts').select('chapter_num, subtopic_slug, is_correct');
  if (error || !data) return [];

  const map = new Map();
  for (const row of data) {
    const key = `${row.chapter_num}::${row.subtopic_slug}`;
    if (!map.has(key)) map.set(key, { chapterNum: row.chapter_num, slug: row.subtopic_slug, correct: 0, wrong: 0 });
    const entry = map.get(key);
    if (row.is_correct) entry.correct += 1;
    else entry.wrong += 1;
  }

  return Array.from(map.values())
    .map((r) => ({ ...r, total: r.correct + r.wrong, wrongRate: (r.wrong / (r.correct + r.wrong)) * 100 }))
    .filter((r) => r.total >= minAttempts)
    .sort((a, b) => b.wrongRate - a.wrongRate);
}

// 소주제별 방문 수 — 그 소주제의 계산기(=시각화 자료)를 몇 번이나 열어봤는지.
// topic_visits는 (user_id, chapter_num, subtopic_slug) unique라서, 행 개수 = 그 소주제를
// 방문한 적 있는 학생 수(중복 재방문은 upsert로 덮어써서 한 번만 남음)와 같다.
// studentIds는 막대에 마우스를 올렸을 때 보여줄 학번 목록 — profiles.student_id가 없는
// 계정(있어선 안 되지만 방어적으로)은 학번 대신 "익명"으로 표시한다.
export async function fetchVisitCountsBySubtopic() {
  const [{ data: visitRows, error: visitError }, { data: profileRows }] = await Promise.all([
    supabase.from('topic_visits').select('chapter_num, subtopic_slug, user_id'),
    supabase.from('profiles').select('id, student_id'),
  ]);
  if (visitError || !visitRows) return [];

  const studentIdOf = new Map((profileRows || []).map((p) => [p.id, p.student_id]));

  const map = new Map();
  for (const row of visitRows) {
    const key = `${row.chapter_num}::${row.subtopic_slug}`;
    if (!map.has(key)) map.set(key, { chapterNum: row.chapter_num, slug: row.subtopic_slug, visitors: 0, studentIds: [] });
    const entry = map.get(key);
    entry.visitors += 1;
    entry.studentIds.push(studentIdOf.get(row.user_id) || '익명');
  }
  return Array.from(map.values()).sort((a, b) => b.visitors - a.visitors);
}

// "AI 학습 분석" 카드의 [전체 학습 현황]에 쓰는 4개 숫자. 개인 식별정보(이름·학번)는 전혀
// 포함하지 않고 카운트만 뽑는다 — 이 숫자들이 그대로 Gemini에게 넘어가는 재료가 된다
// (app/api/analyze-learning). count:'exact', head:true는 행 데이터 없이 개수만 받아온다.
export async function fetchOverallLearningStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalStudents },
    { data: recentVisits },
    { data: recentAttempts },
    { data: recentChats },
    { count: totalProblemAttempts },
    { count: totalAiTutorMessages },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('topic_visits').select('user_id').gte('visited_at', sevenDaysAgo),
    supabase.from('problem_attempts').select('user_id').gte('created_at', sevenDaysAgo),
    supabase.from('chat_logs').select('user_id').eq('role', 'user').gte('created_at', sevenDaysAgo),
    supabase.from('problem_attempts').select('id', { count: 'exact', head: true }),
    supabase.from('chat_logs').select('id', { count: 'exact', head: true }).eq('role', 'user'),
  ]);

  // 세 기록 중 아무거나 최근 7일 안에 남긴 학생이면 "최근 학습에 참여"한 것으로 친다.
  const activeUserIds = new Set();
  for (const rows of [recentVisits, recentAttempts, recentChats]) {
    for (const r of rows || []) activeUserIds.add(r.user_id);
  }

  return {
    totalStudents: totalStudents || 0,
    activeStudents7d: activeUserIds.size,
    totalProblemAttempts: totalProblemAttempts || 0,
    totalAiTutorMessages: totalAiTutorMessages || 0,
  };
}

// AI 튜터에게 몇 번 물어봤는지(챕터별) + 최근 질문 목록. 질문 문장을 자동으로 주제 분류하지는
// 않는다(그건 확신 없이 만들면 오히려 오해를 살 수 있어서) — 대신 원문을 그대로 보여줘서
// 교수자가 직접 훑어보고 판단할 수 있게 한다.
export async function fetchAiTutorStats(recentPerChapter = 5) {
  const { data, error } = await supabase
    .from('chat_logs')
    .select('chapter_num, content, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1000); // 강의 규모에서 충분한 최근분 상한
  if (error || !data) return { byChapter: [], total: 0 };

  const map = new Map();
  for (const row of data) {
    const key = row.chapter_num || '(챕터 없음)';
    if (!map.has(key)) map.set(key, { chapterNum: key, count: 0, recent: [] });
    const entry = map.get(key);
    entry.count += 1;
    if (entry.recent.length < recentPerChapter) entry.recent.push({ content: row.content, createdAt: row.created_at });
  }

  return { byChapter: Array.from(map.values()).sort((a, b) => b.count - a.count), total: data.length };
}
