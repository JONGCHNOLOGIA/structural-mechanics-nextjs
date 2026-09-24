// 문제 생성기의 "내 풀이(사진)" 채점 요청을 받아 Gemini Vision에 보내는 서버 라우트.
// GEMINI_API_KEY는 .env.local(로컬)·Vercel 환경변수(배포)에만 넣고, 절대 NEXT_PUBLIC_ 접두어를
// 붙이지 않는다 — 이 파일은 서버에서만 실행되므로 클라이언트로 키가 노출되지 않는다.
// (참고: AITUTOR.html 프로토타입은 이 키를 클라이언트 JS에 그대로 박아뒀었는데, 그러면 브라우저
// "소스 보기"만으로 키가 유출된다 — 그래서 이 프로젝트는 항상 서버 라우트를 거친다.)
import { callGemini } from '@/lib/geminiFetch';

// ai-tutor 라우트와 같은 이유로 명시한다 — 사진 채점은 Vision + 추론까지 겹쳐서 실측으로
// 13초 넘게 걸린 적도 있다(기본 10초 제한이면 그 안에서 그냥 죽는다).
export const maxDuration = 60;

const SYSTEM_PROMPT =
  '당신은 세종대학교 건축공학과 구조역학 수업의 AI 조교입니다. 학생이 손으로 푼 풀이 사진을 보고, ' +
  '주어진 문제와 정답을 참고해서 과정이 맞는지 확인하세요. 최종 답이 맞았는지 먼저 한 줄로 밝히고, ' +
  '계산 과정에서 실수한 부분이 있으면 구체적으로 어느 단계인지 짚어주세요. 잘한 부분은 짧게 칭찬하고, ' +
  '전체 분량은 6~8문장 이내로, 한국어로, 격려하는 톤을 유지하세요. ' +
  // 이 피드백 박스는 AI 튜터 채팅창과 마찬가지로 마크다운·LaTeX를 렌더링하지 않는 순수 텍스트
  // 창이다. 이 지침이 빠져 있어서 "$25.95\text{ MPa}$", "\frac{\pi \cdot 39^2}{4}" 같은 LaTeX
  // 원문이 그대로 화면에 찍히는 버그가 있었다 — AI 튜터 프롬프트(lib/aiTutorPrompt.js)에는
  // 이미 있던 지침을 여기도 넣는다.
  '형식(중요): 이 결과창은 마크다운·LaTeX를 렌더링하지 않는 순수 텍스트 창입니다. **, $...$, ' +
  '\\text{...}, \\frac{...}{...} 같은 마크다운/LaTeX 기호는 쓰지 말고, 일반 문장과 줄바꿈만으로 ' +
  '답하세요. 수식은 "sigma = P / A"처럼 풀어서 쓰거나 "σ = P/A"처럼 기호를 문장에 그냥 섞어 쓰세요.';

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

  const { imageBase64, imageMediaType, prompt, answers } = body || {};
  if (!imageBase64 || !imageMediaType) {
    return Response.json({ error: '첨부된 풀이 이미지가 없어요.' }, { status: 400 });
  }

  const userText = [
    `문제:\n${prompt || '(문제 지문 없음)'}`,
    `\n정답:\n${Array.isArray(answers) && answers.length ? answers.join('\n') : '(정답 정보 없음)'}`,
    '\n첨부된 사진은 이 문제에 대한 학생의 손풀이입니다. 검토해주세요.',
  ].join('\n');

  try {
    const feedback = await callGemini(apiKey, {
      systemInstruction: { parts: { text: SYSTEM_PROMPT } },
      contents: [
        {
          role: 'user',
          parts: [
            { text: userText },
            { inline_data: { mime_type: imageMediaType, data: imageBase64 } },
          ],
        },
      ],
      // 이 모델(gemini-3.5-flash)은 "생각(thinking)" 토큰도 maxOutputTokens 예산 안에서 쓴다.
      // 사진 채점처럼 비교·추론이 필요한 요청은 생각에만 1000~1400토큰을 쓰는 걸 실측했다
      // (700으로는 답변이 26토큰에서 끊겼다) — 답변 분량(700토큰 지침)에 여유를 더해 넉넉히 잡는다.
      generationConfig: { maxOutputTokens: 3000 },
    });
    return Response.json({ feedback });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
