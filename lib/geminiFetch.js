// /api/ai-tutor, /api/grade-solution이 공용으로 쓰는 Gemini 호출 헬퍼. 서버 라우트에서만 import한다.
//
// 모델 선정: gemini-3.8-flash / gemini-3.6-flash / gemini-flash-latest는 실제로 호출해보니
// 503(과부하) 또는 응답 자체가 없는 타임아웃이 잦았고, gemini-2.5-flash류는 이 키로는
// "신규 사용자에게 더 이상 제공 안 함"(404)으로 막혀 있었다. gemini-3.5-flash가 실제로
// 안정적으로 응답해서 이걸로 고정한다 — 모델 가용성은 계정/시점마다 달라질 수 있으니,
// 나중에 이 모델도 막히면 GET https://generativelanguage.googleapis.com/v1beta/models?key=...
// 로 그 시점에 쓸 수 있는 모델 목록을 다시 확인하면 된다.
export const GEMINI_MODEL = 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Gemini가 "일시적 과부하(503)"를 꽤 자주 돌려주는데, 구글 스스로도 "보통 금방 풀린다"고
// 안내하는 오류라 몇 번 짧게 재시도한다. 503이 아닌 오류(키 문제 등)는 바로 포기한다.
export async function callGemini(apiKey, payload) {
  const body = JSON.stringify(payload);
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // 쿼리스트링(?key=...)이 아니라 헤더로 넘겨서 키가 URL·서버 로그에 남지 않게 한다.
          'x-goog-api-key': apiKey,
        },
        body,
      });
    } catch (err) {
      throw new Error('AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
    if (res.ok || res.status !== 503 || attempt === 2) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }

  if (!res.ok) {
    throw new Error('요청이 실패했어요(모델이 혼잡할 수 있어요). 잠시 후 다시 시도해주세요.');
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text?.trim();
  if (!text) {
    throw new Error('AI로부터 답변을 받아오지 못했어요. 다시 시도해주세요.');
  }
  return text;
}
