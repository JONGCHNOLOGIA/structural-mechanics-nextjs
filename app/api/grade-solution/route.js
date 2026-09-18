// 문제 생성기의 "내 풀이(사진)" 채점 요청을 받아 Gemini Vision에 보내는 서버 라우트.
// GEMINI_API_KEY는 .env.local(로컬)·Vercel 환경변수(배포)에만 넣고, 절대 NEXT_PUBLIC_ 접두어를
// 붙이지 않는다 — 이 파일은 서버에서만 실행되므로 클라이언트로 키가 노출되지 않는다.
// (참고: AITUTOR.html 프로토타입은 이 키를 클라이언트 JS에 그대로 박아뒀었는데, 그러면 브라우저
// "소스 보기"만으로 키가 유출된다 — 그래서 이 프로젝트는 항상 서버 라우트를 거친다.)
import { callGemini } from '@/lib/geminiFetch';

const SYSTEM_PROMPT =
  '당신은 세종대학교 건축공학과 구조역학 수업의 AI 조교입니다. 학생이 손으로 푼 풀이 사진을 보고, ' +
  '주어진 문제와 정답을 참고해서 과정이 맞는지 확인하세요. 최종 답이 맞았는지 먼저 한 줄로 밝히고, ' +
  '계산 과정에서 실수한 부분이 있으면 구체적으로 어느 단계인지 짚어주세요. 잘한 부분은 짧게 칭찬하고, ' +
  '전체 분량은 6~8문장 이내로, 한국어로, 격려하는 톤을 유지하세요.';

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
      generationConfig: { maxOutputTokens: 700 },
    });
    return Response.json({ feedback });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
