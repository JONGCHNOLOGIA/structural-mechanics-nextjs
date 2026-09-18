// 문제 생성기의 "내 풀이(사진)" 채점 요청을 받아 Claude Vision에 보내는 서버 라우트.
// ANTHROPIC_API_KEY는 .env.local(로컬)·Vercel 환경변수(배포)에만 넣고, 절대 NEXT_PUBLIC_ 접두어를
// 붙이지 않는다 — 이 파일은 서버에서만 실행되므로 클라이언트로 키가 노출되지 않는다.
const MODEL = 'claude-sonnet-5';

const SYSTEM_PROMPT =
  '당신은 세종대학교 건축공학과 구조역학 수업의 AI 조교입니다. 학생이 손으로 푼 풀이 사진을 보고, ' +
  '주어진 문제와 정답을 참고해서 과정이 맞는지 확인하세요. 최종 답이 맞았는지 먼저 한 줄로 밝히고, ' +
  '계산 과정에서 실수한 부분이 있으면 구체적으로 어느 단계인지 짚어주세요. 잘한 부분은 짧게 칭찬하고, ' +
  '전체 분량은 6~8문장 이내로, 한국어로, 격려하는 톤을 유지하세요.';

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY가 서버에 설정되어 있지 않아요. .env.local에 키를 추가한 뒤 dev 서버를 다시 시작해주세요.' },
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

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
    });
  } catch {
    return Response.json({ error: 'AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    return Response.json({ error: '채점 요청이 실패했어요. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }

  const data = await anthropicRes.json();
  const feedback = data?.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!feedback) {
    return Response.json({ error: '피드백을 받아오지 못했어요. 다시 시도해주세요.' }, { status: 502 });
  }

  return Response.json({ feedback });
}
