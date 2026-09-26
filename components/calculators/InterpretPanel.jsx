'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

// 계산기 VISUALIZER 결과 아래에 붙는 "AI 해석하기" 버튼 + 결과 박스. AI 튜터 채팅창과 달리
// 학생이 질문을 적을 필요 없이, 계산기가 이미 계산해 낸 결과값(summary)을 그대로 서버에 보내서
// 한 번만 해석을 받는 단발성 기능이라 대화 기록은 두지 않는다.
export default function InterpretPanel({ summary }) {
  const pathname = usePathname();
  const chapterMatch = pathname ? pathname.match(/\/ch(\d+)\//) : null;
  const chapterNum = chapterMatch ? `CH.${chapterMatch[1]}` : null;

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  async function interpret() {
    if (loading || !summary) return;
    setLoading(true);
    setError(null);
    // AI 튜터 패널과 같은 이유로 클라이언트 쪽에서도 시간제한을 둔다 — 서버 라우트의
    // maxDuration(60초)보다 15초 여유를 더 준다.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);
    try {
      const res = await fetch('/api/interpret-result', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chapterNum, context: summary }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '해석을 받아오지 못했어요.');
      setAnswer(data.answer);
    } catch (err) {
      setError(err.name === 'AbortError' ? '응답이 너무 오래 걸려서 중단했어요. 다시 시도해주세요.' : err.message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <div className="interpret-panel">
      <button type="button" className="interpret-btn" onClick={interpret} disabled={loading}>
        {loading ? '🧠 AI가 해석하는 중...' : answer ? '🧠 다시 해석하기' : '🧠 AI 해석하기'}
      </button>
      {error && <div className="error-box" style={{ marginTop: 8 }}>⚠ {error}</div>}
      {answer && <div className="interpret-result">{answer}</div>}
    </div>
  );
}
