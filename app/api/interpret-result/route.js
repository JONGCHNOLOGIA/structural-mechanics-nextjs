// 계산기 VISUALIZER의 "AI 해석하기" 버튼이 호출하는 서버 라우트. 계산기가 이미 계산해 낸
// 결과값(context)을 그대로 Gemini에게 넘겨 "왜 이렇게 나왔는지"만 해석하게 한다 — 새로운
// 계산은 하지 않는다. ai-tutor·grade-solution과 같은 이유로 GEMINI_API_KEY는 서버에서만 쓴다.
import { buildInterpretSystemPrompt } from '@/lib/interpretResultPrompt';
import { callGemini } from '@/lib/geminiFetch';

// ai-tutor·grade-solution 라우트와 같은 이유(생각 토큰이 응답을 늦출 수 있음)로 명시한다.
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

  const { chapterNum, context } = body || {};
  const ctx = typeof context === 'string' ? context.trim() : '';
  if (!ctx) return Response.json({ error: '해석할 계산 결과가 없어요.' }, { status: 400 });

  try {
    const answer = await callGemini(apiKey, {
      systemInstruction: { parts: { text: buildInterpretSystemPrompt(chapterNum) } },
      contents: [
        { role: 'user', parts: [{ text: `[계산 결과]\n${ctx}\n\n위 결과가 왜 이렇게 나왔는지 학생에게 설명해주세요.` }] },
      ],
      generationConfig: { maxOutputTokens: 2000 },
    });
    return Response.json({ answer });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
