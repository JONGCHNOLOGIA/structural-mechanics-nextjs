// 우측 "AI TUTOR" 채팅 패널이 호출하는 서버 라우트. /api/grade-solution과 같은 이유로
// GEMINI_API_KEY는 여기(서버)에서만 쓰고 클라이언트에는 절대 보내지 않는다.
import { buildSystemPrompt } from '@/lib/aiTutorPrompt';

const MODEL = 'gemini-3.8-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

  let geminiRes;
  try {
    geminiRes = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey, // 쿼리스트링이 아니라 헤더로 — URL·서버 로그에 키가 안 남게
      },
      body: JSON.stringify({
        systemInstruction: { parts: { text: buildSystemPrompt(chapterNum) } },
        contents,
        generationConfig: { maxOutputTokens: 800 },
      }),
    });
  } catch {
    return Response.json({ error: 'AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }

  if (!geminiRes.ok) {
    return Response.json({ error: '답변 요청이 실패했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }

  const data = await geminiRes.json();
  const answer = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text?.trim();
  if (!answer) {
    return Response.json({ error: '답변을 받아오지 못했어요. 다시 시도해주세요.' }, { status: 502 });
  }

  return Response.json({ answer });
}
