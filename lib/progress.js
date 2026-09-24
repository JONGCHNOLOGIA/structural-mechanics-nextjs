import { supabase } from '@/lib/supabaseClient';
import { fileToResizedBase64 } from '@/lib/resizeImage';

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

// extra: { prompt, answers, diagram, aiFeedback, solutionFile } — "문제 다시보기"에서 그때 그
// 문제/풀이사진/AI 설명까지 같이 보여주기 위해, 정답 확인 시점에 있던 걸 통째로 같이 저장한다.
// 전부 선택 사항 — 사진을 안 올렸거나 AI 검토를 안 받았으면 그 부분만 비워둔다.
export async function recordAttempt(chapterNum, subtopicSlug, isCorrect, extra = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  let solutionImagePath = null;
  if (extra.solutionFile) {
    try {
      const { data, mediaType } = await fileToResizedBase64(extra.solutionFile);
      const blob = await fetch(`data:${mediaType};base64,${data}`).then((r) => r.blob());
      const ext = mediaType === 'image/png' ? 'png' : 'jpg';
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('solution-images').upload(path, blob, { contentType: mediaType });
      if (!error) solutionImagePath = path;
    } catch {
      // 사진 업로드가 실패해도(용량/네트워크 등) 채점 기록 자체는 남겨야 하니 조용히 넘어간다 —
      // "다시보기"에서 그 항목만 사진 없이 보이게 된다.
    }
  }

  const base = { user_id: session.user.id, chapter_num: chapterNum, subtopic_slug: subtopicSlug, is_correct: isCorrect };
  const { error } = await supabase.from('problem_attempts').insert({
    ...base,
    prompt: extra.prompt ?? null,
    answers: extra.answers ?? null,
    diagram: extra.diagram ?? null,
    ai_feedback: extra.aiFeedback ?? null,
    solution_image_path: solutionImagePath,
  });
  if (error) {
    // supabase/schema.sql의 새 컬럼(prompt/answers/diagram/ai_feedback/solution_image_path)을
    // 아직 Supabase SQL Editor에서 실행하기 전이면 이 insert가 통째로 거부된다 — "다시보기"가
    // 못 쓰는 건 어쩔 수 없어도, 홈 화면 "문제 풀이 %"·"최근 틀린 개념"의 근거인 기존 필드
    // 기록까지 같이 막히면 안 되니 원래 4개 필드만으로 한 번 더 시도한다.
    console.warn('problem_attempts insert에 새 컬럼이 없어 기본 필드만 다시 저장합니다 — supabase/schema.sql을 실행해주세요.', error);
    await supabase.from('problem_attempts').insert(base);
  }
}

// "문제 다시보기"에서 풀이 사진을 보여줄 때 쓰는 서명된 URL — solution-images 버킷이 비공개라
// 그냥 경로로는 못 열고, 매번 짧게(1시간) 유효한 URL을 새로 받아와야 한다.
export async function getSolutionImageUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('solution-images').createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
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

// 문제 제작 허브의 "문제 다시보기"용 — 집계하지 않고 시도 하나하나를 최신순 그대로 돌려준다.
export async function fetchRecentAttempts(limit = 20) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from('problem_attempts')
    .select('id, chapter_num, subtopic_slug, is_correct, created_at, prompt, answers, diagram, ai_feedback, solution_image_path')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    // recordAttempt와 같은 이유(supabase/schema.sql 미적용) — 새 컬럼 없이도 기존 기록(맞음/틀림)
    // 만이라도 "다시보기"에 계속 보이게 예전 select로 한 번 더 시도한다.
    console.warn('problem_attempts select에 새 컬럼이 없어 기본 필드만 다시 조회합니다 — supabase/schema.sql을 실행해주세요.', error);
    const { data: fallback } = await supabase
      .from('problem_attempts')
      .select('id, chapter_num, subtopic_slug, is_correct, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    return fallback || [];
  }
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
