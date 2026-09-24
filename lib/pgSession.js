// 문제 생성기(ProblemGeneratorView.jsx)의 "이어서 풀기" 기능이 쓰는 로컬 저장소 레이어.
// 생성된 문제(prompt/answers/diagram — 매번 랜덤 숫자로 새로 만들어지는 것)는 서버에 저장하지
// 않고 브라우저에만 있던 상태라, 페이지를 벗어나면 그대로 사라졌다. 정답 확인을 안 한 문제가
// 남아있는 채로 떠난 세션을 과목별로 하나씩만 localStorage에 저장해뒀다가, 문제 제작 허브에서
// "이어서 풀기"로 돌아오면 그 화면 그대로(고른 챕터·소주제·생성된 문제·이미 채점한 것까지)
// 복원한다. 세션은 subject(예: 'problem-generator-1')당 하나만 유지 — 새로 "문제 생성하기"를
// 누르면 이전 걸 덮어쓴다.
const KEY_PREFIX = 'pgSession:';

export function savePgSession(subject, data) {
  try {
    localStorage.setItem(
      KEY_PREFIX + subject,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        selectedChapters: [...data.selectedChapters],
        selectedSubtopics: [...data.selectedSubtopics],
        numQuestions: data.numQuestions,
        problems: data.problems,
        revealed: [...data.revealed],
        graded: data.graded,
      })
    );
  } catch {
    // 프라이빗 모드 등으로 localStorage를 못 쓰면 "이어서 풀기"만 못 쓰게 되고, 나머지 기능엔
    // 영향이 없어야 하므로 조용히 무시한다.
  }
}

export function loadPgSession(subject) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + subject);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPgSession(subject) {
  try {
    localStorage.removeItem(KEY_PREFIX + subject);
  } catch {
    // 무시
  }
}

// 문제 제작 허브에서 "이어서 풀기" 카드를 띄울지 판단할 때 쓴다 — 정답 확인을 안 한(graded에
// 없는) 문제가 하나라도 남은 과목만 돌려준다.
export function listUnfinishedPgSessions(subjects) {
  return subjects
    .map(({ subject, label, href }) => {
      const session = loadPgSession(subject);
      if (!session || !Array.isArray(session.problems) || session.problems.length === 0) return null;
      const gradedCount = Object.keys(session.graded || {}).length;
      const remaining = session.problems.length - gradedCount;
      if (remaining <= 0) return null;
      return { subject, label, href, total: session.problems.length, remaining, savedAt: session.savedAt };
    })
    .filter(Boolean);
}
