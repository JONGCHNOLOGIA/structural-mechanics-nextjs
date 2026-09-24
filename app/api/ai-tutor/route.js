// 우측 "AI TUTOR" 채팅 패널이 호출하는 서버 라우트. /api/grade-solution과 같은 이유로
// GEMINI_API_KEY는 여기(서버)에서만 쓰고 클라이언트에는 절대 보내지 않는다.
import { buildSystemPrompt } from '@/lib/aiTutorPrompt';
import { callGemini } from '@/lib/geminiFetch';

// Vercel 서버리스 함수는 별다른 설정이 없으면 기본 10초에서 끊는다(요금제에 따라 다름).
// maxOutputTokens를 올린 뒤로 "생각(thinking)" 토큰까지 써서 답이 3~8초, 길면 그 이상 걸릴 수
// 있는데, 그 시점에 함수가 그냥 죽어버리면 브라우저는 응답도 에러도 못 받고 "생각 중..."에
// 멈춘 것처럼 보인다 — 이 라우트가 최대 60초까지는 버티도록 명시한다.
export const maxDuration = 60;

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'GEMINI_API_KEY가 서버에 설정되어 있지 않아요. .env.local에 키를 추가한 뒤 dev 서버를 다시 시작해주세요.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
  }

  const { chapterNum, question, history } = body || {};
  const q = typeof question === 'string' ? question.trim() : '';
  if (!q) return Response.json({ error: '질문이 비어 있어요.' }, { status: 400 });

  // history는 브라우저 메모리에만 있던 이전 대화(role: 'user'|'ai')를 그대로 넘겨받은 것 —
  // 서버에는 저장하지 않고 이번 요청 하나를 만드는 데만 쓴다. 너무 길어지면 프롬프트가
  // 커지니 최근 8턴만 사용한다.
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const contents = [
    ...recentHistory
      .filter((h) => h && typeof h.text === 'string' && h.text.trim())
      .map((h) => ({ role: h.role === 'ai' ? 'model' : 'user', parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: q }] },
  ];

  try {
    const answer = await callGemini(apiKey, {
      systemInstruction: { parts: { text: buildSystemPrompt(chapterNum) } },
      contents,
      // grade-solution에서 겪은 것과 같은 이유(생각 토큰이 maxOutputTokens를 같이 씀)로 여유를 둔다.
      generationConfig: { maxOutputTokens: 2000 },
    });
    return Response.json({ answer });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
