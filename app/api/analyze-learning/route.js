// 교수자 통계 화면의 "AI 학습 분석" 버튼이 호출하는 서버 라우트. 클라이언트(components/
// AdminStatsView.jsx)가 Supabase에서 이미 집계해 둔 숫자(stats)만 넘겨받아 Gemini에 전달한다 —
// 이 라우트 자체는 DB를 조회하지 않는다("AI가 직접 DB를 무제한 조회하는 구조는 만들지 않는다").
// GEMINI_API_KEY는 ai-tutor·grade-solution·interpret-result와 같은 이유로 서버에서만 쓴다.
import { buildAnalyzeLearningSystemPrompt } from '@/lib/analyzeLearningPrompt';
import { callGemini } from '@/lib/geminiFetch';

export const maxDuration = 60;

// 모델이 지침대로 "[분석]"/"[수업참고]" 표시를 그대로 냈다고 가정하고 나눈다. 혹시 모델이
// 표시를 빠뜨려도(드물지만 완전히 없을 수 있음) 전체 텍스트를 통째로 분석 칸에 넣어서,
// 화면에 아무것도 안 뜨는 것보다는 낫게 만든다.
function parseSections(text) {
  const marker = '[수업참고]';
  const idx = text.indexOf(marker);
  if (idx === -1) return { analysis: text.replace('[분석]', '').trim(), suggestion: '' };
  const analysis = text.slice(0, idx).replace('[분석]', '').trim();
  const suggestion = text.slice(idx + marker.length).trim();
  return { analysis, suggestion };
}

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

  const { stats } = body || {};
  if (!stats || typeof stats !== 'object') {
    return Response.json({ error: '분석할 집계 데이터가 없어요.' }, { status: 400 });
  }

  try {
    const raw = await callGemini(apiKey, {
      systemInstruction: { parts: { text: buildAnalyzeLearningSystemPrompt() } },
      contents: [
        {
          role: 'user',
          parts: [{ text: `[집계 데이터]\n${JSON.stringify(stats, null, 2)}\n\n위 데이터로 [분석]과 [수업참고]를 작성해주세요.` }],
        },
      ],
      // interpret-result에서 겪은 것과 같은 이유(생각 토큰이 예산을 먹어 문장이 중간에 끊김)로
      // 처음부터 여유 있게 잡는다.
      generationConfig: { maxOutputTokens: 3000 },
    });
    return Response.json({ ...parseSections(raw), raw });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
