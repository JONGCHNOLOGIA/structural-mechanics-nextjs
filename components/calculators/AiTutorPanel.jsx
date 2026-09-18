'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// 소주제 계산기 페이지 우측(또는 FloatingActions의 떠있는 패널)에 항상 붙는 AI 튜터 채팅창.
// URL의 "/ch3/" 같은 조각에서 챕터 번호를 뽑아 그 챕터의 강의자료를 근거로 답하도록
// 서버(/api/ai-tutor)에 넘긴다 — 소주제 URL이 없는 곳(로비, 문제 제작 등)에서는
// chapterNum이 없는 채로, 일반 범위 질문으로 동작한다.
// question: 소주제마다 다른 "학생이 물어볼 법한 예시 질문" — 누르면 그 질문으로 바로 물어본다.
// 대화 기록은 이 페이지를 보는 동안만 브라우저 메모리에 남고 서버에는 저장되지 않는다
// (페이지를 새로고침하면 사라짐 — 챕터별로 기록을 영구 저장하는 건 다음 단계로 미뤄둔 부분).
export default function AiTutorPanel({ question }) {
  const pathname = usePathname();
  const chapterMatch = pathname ? pathname.match(/\/ch(\d+)\//) : null;
  const chapterNum = chapterMatch ? `CH.${chapterMatch[1]}` : null;

  const [messages, setMessages] = useState([]); // { role: 'user' | 'ai', text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(rawText) {
    const q = rawText.trim();
    if (!q || loading) return;
    const history = messages; // 방금 보낼 질문을 넣기 전까지의 기록만 컨텍스트로 보낸다
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chapterNum, question: q, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '답변을 받아오지 못했어요.');
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', text: `⚠ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel panel-ai">
      <h3>
        AI TUTOR
        {chapterNum && (
          <span className="badge" style={{ marginLeft: 6 }}>
            {chapterNum} 자료 기반
          </span>
        )}
      </h3>
      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && question && (
          <div className="msg ai" style={{ cursor: 'pointer' }} onClick={() => send(question)}>
            💡 예시 질문: {question}
          </div>
        )}
        {messages.length === 0 && !question && (
          <div className="msg ai">
            {chapterNum ? `${chapterNum} 내용에 대해 궁금한 점을 물어보세요.` : '구조역학에 대해 궁금한 점을 물어보세요.'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={'msg ' + (m.role === 'ai' ? 'ai' : 'user')} style={{ whiteSpace: 'pre-wrap' }}>
            {m.text}
          </div>
        ))}
        {loading && <div className="msg ai">생각 중...</div>}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="질문을 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          disabled={loading}
        />
        <button onClick={() => send(input)} disabled={loading} aria-label="전송">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l16-8-6 16-3-7-7-1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
