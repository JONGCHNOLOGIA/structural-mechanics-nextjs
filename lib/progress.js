import { supabase } from '@/lib/supabaseClient';

// 홈 화면의 "이어서 학습하기" / "학습 현황" / "최근 틀린 개념"이 쓰는 데이터 레이어.
// 챕터/소주제는 lib/chapters.js와 동일하게 (chapterNum, slug) 문자열 쌍으로 식별한다.

export async function recordVisit(chapterNum, subtopicSlug) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  await supabase
    .from('topic_visits')
    .upsert(
      { user_id: session.user.id, chapter_num: chapterNum, subtopic_slug: subtopicSlug, visited_at: new Date().toISOString() },
      { onConflict: 'user_id,chapter_num,subtopic_slug' }
    );
}

export async function recordAttempt(chapterNum, subtopicSlug, isCorrect) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('problem_attempts').insert({
    user_id: session.user.id,
    chapter_num: chapterNum,
    subtopic_slug: subtopicSlug,
    is_correct: isCorrect,
  });
}

export async function fetchRecentVisits(limit = 3) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];
  const { data } = await supabase
    .from('topic_visits')
    .select('chapter_num, subtopic_slug, visited_at')
    .eq('user_id', session.user.id)
    .order('visited_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// 소주제별로 시도 횟수/정답/오답을 집계. 최근 오답 시각도 같이 돌려줘서 "최근 틀린 개념" 정렬에 쓴다.
export async function fetchProgressSummary() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];
  const { data } = await supabase
    .from('problem_attempts')
    .select('chapter_num, subtopic_slug, is_correct, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
  if (!data) return [];

  const map = new Map();
  for (const row of data) {
    const key = `${row.chapter_num}::${row.subtopic_slug}`;
    if (!map.has(key)) {
      map.set(key, { chapterNum: row.chapter_num, slug: row.subtopic_slug, correct: 0, wrong: 0, lastWrongAt: null });
    }
    const entry = map.get(key);
    if (row.is_correct) entry.correct += 1;
    else {
      entry.wrong += 1;
      if (!entry.lastWrongAt) entry.lastWrongAt = row.created_at; // data는 최신순 정렬이라 첫 오답이 가장 최근 오답
    }
  }
  return Array.from(map.values());
}
