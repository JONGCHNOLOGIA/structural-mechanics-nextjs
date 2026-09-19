import { supabase } from '@/lib/supabaseClient';

// AI 튜터 채팅 한 번(질문+답변)을 chat_logs에 남긴다. topic_visits/problem_attempts와 같은 패턴 —
// 로그인 안 했으면 조용히 아무것도 안 한다. 실패해도 채팅 자체는 계속 써야 하므로 호출부에서
// await 없이 fire-and-forget으로 부르거나, 실패를 UI에 노출하지 않는다.
export async function recordAiTutorMessage(chapterNum, question, answer) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('chat_logs').insert([
    { user_id: session.user.id, chapter_num: chapterNum ?? null, role: 'user', content: question },
    { user_id: session.user.id, chapter_num: chapterNum ?? null, role: 'assistant', content: answer },
  ]);
}
