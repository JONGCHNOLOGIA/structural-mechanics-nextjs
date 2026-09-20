// /api/ai-tutor, /api/grade-solution이 공용으로 쓰는 Gemini 호출 헬퍼. 서버 라우트에서만 import한다.
//
// 모델 선정: gemini-3.8-flash / gemini-3.6-flash / gemini-flash-latest는 실제로 호출해보니
// 503(과부하) 또는 응답 자체가 없는 타임아웃이 잦았고, gemini-2.5-flash류는 이 키로는
// "신규 사용자에게 더 이상 제공 안 함"(404)으로 막혀 있었다. gemini-3.5-flash·gemini-3.1-flash-lite가
// 실제로 안정적으로 응답해서 이 둘을 쓴다 — 모델 가용성은 계정/시점마다 달라질 수 있으니, 나중에
// 둘 다 막히면 GET https://generativelanguage.googleapis.com/v1beta/models?key=... 로 그 시점에
// 쓸 수 있는 모델 목록을 다시 확인하면 된다.
//
// 무료 키는 분당 요청 수 자체가 낮게 묶여 있어서(과부하 502가 잦은 근본 원인), 재시도만으로는
// 한계가 있다 — 학생 여러 명이 동시에 쓸 정도로 트래픽이 늘면 Google AI Studio에서 결제를
// 연결해 유료 등급으로 올리는 게 가장 확실한 해결책이다(Gemini Flash는 유료 등급도 매우 저렴함).
const PRIMARY_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite'; // 주 모델이 계속 과부하일 때만 마지막으로 한 번 시도

function endpointFor(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

async function tryModel(model, apiKey, body, retries) {
  let res;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      res = await fetch(endpointFor(model), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // 쿼리스트링(?key=...)이 아니라 헤더로 넘겨서 키가 URL·서버 로그에 남지 않게 한다.
          'x-goog-api-key': apiKey,
        },
        body,
      });
    } catch {
      return null; // 네트워크 자체가 안 됐으면 폴백 모델도 의미 없으니 호출부에서 바로 에러 처리
    }
    if (res.ok || res.status !== 503 || attempt === retries - 1) return res;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return res;
}

// Gemini가 "일시적 과부하(503)"를 꽤 자주 돌려주는데, 구글 스스로도 "보통 금방 풀린다"고
// 안내하는 오류라 주 모델로 두 번 재시도하고, 그래도 안 되면 더 가벼운 폴백 모델로 한 번 더
// 시도한다. 503이 아닌 오류(키 문제 등)는 재시도 없이 바로 포기한다.
export async function callGemini(apiKey, payload) {
  const body = JSON.stringify(payload);

  let res = await tryModel(PRIMARY_MODEL, apiKey, body, 2);
  if (!res) throw new Error('AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
  if (!res.ok && res.status === 503) {
    const fallbackRes = await tryModel(FALLBACK_MODEL, apiKey, body, 1);
    if (fallbackRes) res = fallbackRes;
  }

  if (!res.ok) {
    throw new Error('요청이 실패했어요(모델이 혼잡할 수 있어요). 잠시 후 다시 시도해주세요.');
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.find((p) => p.text)?.text?.trim();
  if (!text) {
    // finishReason이 MAX_TOKENS인데 텍스트가 없다면, maxOutputTokens를 다 채운 게 "생각(thinking)"
    // 토큰이었을 가능성이 크다 — 이 모델은 내부 추론도 같은 토큰 예산을 쓴다(아래 참고).
    // 실제로 겪은 사례: grade-solution에서 maxOutputTokens=700일 때 thoughtsTokenCount=670으로
    // 거의 다 써버려서 답변이 26토큰(문장 하나도 안 됨)에서 끊겼다. 이 에러가 다시 보이면
    // 먼저 호출부의 maxOutputTokens를 올려볼 것 — 모델을 바꾸거나 재시도해도 소용없다.
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('AI 응답이 토큰 한도 안에서 끝나지 못했어요(생각하는 데 토큰을 다 써버렸을 수 있어요). maxOutputTokens를 늘려야 해요.');
    }
    throw new Error('AI로부터 답변을 받아오지 못했어요. 다시 시도해주세요.');
  }
  return text;
}
