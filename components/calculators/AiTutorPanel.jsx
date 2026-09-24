'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { recordAiTutorMessage } from '@/lib/aiTutorLog';
import EditableText from '@/components/EditableText';
import { useSiteContent } from '@/components/SiteContentProvider';

// 소주제 계산기 페이지 우측(또는 FloatingActions의 떠있는 패널)에 항상 붙는 AI 튜터 채팅창.
// URL의 "/ch3/" 같은 조각에서 챕터 번호를 뽑아 그 챕터의 강의자료를 근거로 답하도록
// 서버(/api/ai-tutor)에 넘긴다 — 소주제 URL이 없는 곳(로비, 문제 제작 등)에서는
// chapterNum이 없는 채로, 일반 범위 질문으로 동작한다.
// question: 소주제마다 다른 "학생이 물어볼 법한 예시 질문" — 누르면 그 질문으로 바로 물어본다.
// 계산기 파일 26개마다 박혀 있는 이 문구를 관리자가 코드 수정 없이 고칠 수 있도록,
// EditableText와 같은 site_content 맵을 이 URL 경로를 키로 삼아 직접 읽는다 — 그래서
// question prop은 그대로 "기본값"으로 남고, 호출부(각 계산기 파일)는 하나도 안 건드려도 된다.
// 대화 기록은 이 페이지를 보는 동안만 브라우저 메모리에 남고 서버에는 저장되지 않는다
// (페이지를 새로고침하면 사라짐 — 챕터별로 기록을 영구 저장하는 건 다음 단계로 미뤄둔 부분).
export default function AiTutorPanel({ question }) {
  const pathname = usePathname();
  const chapterMatch = pathname ? pathname.match(/\/ch(\d+)\//) : null;
  const chapterNum = chapterMatch ? `CH.${chapterMatch[1]}` : null;

  const { content } = useSiteContent();
  const questionKey = question && pathname ? `aiTutor.question.${pathname.replace(/^\//, '').replace(/\//g, '.')}` : null;
  const resolvedQuestion = questionKey ? content[questionKey] ?? question : question;

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
    // 서버가 응답도 에러도 없이 그냥 끊기는 경우(예: 서버리스 함수 시간제한)에 대비해서,
    // 일정 시간 넘게 아무 응답이 없으면 클라이언트 쪽에서 직접 포기하고 에러로 처리한다 —
    // 이게 없으면 "생각 중..."이 영원히 떠 있게 된다.
    // 서버 라우트의 maxDuration(60초)과 똑같이 60초로 맞췄다가, 실제로 서버가 정확히 60.0초
    // 걸려 응답에 성공했는데 클라이언트가 몇 ms 먼저 포기해버려 멀쩡한 답을 에러로 날려버리는
    // 경쟁 상태를 직접 재현했다 — 서버 쪽 한도보다 15초 여유(네트워크 왕복 포함)를 더 준다.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chapterNum, question: q, history }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '답변을 받아오지 못했어요.');
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
      // 교수자 통계용 기록 — 실패해도 채팅 자체는 이미 끝났으니 조용히 무시한다.
      recordAiTutorMessage(chapterNum, q, data.answer).catch(() => {});
    } catch (err) {
      const message = err.name === 'AbortError' ? '응답이 너무 오래 걸려서 중단했어요. 다시 시도해주세요.' : err.message;
      setMessages((prev) => [...prev, { role: 'ai', text: `⚠ ${message}` }]);
    } finally {
      clearTimeout(timeoutId);
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
          <div className="msg ai">
            💡 예시 질문:{' '}
            <span style={{ cursor: 'pointer' }} onClick={() => send(resolvedQuestion)}>
              <EditableText as="span" contentKey={questionKey} defaultText={question} />
            </span>
          </div>
        )}
        {/* 챕터 배지(위 h3)가 이미 어떤 챕터 기준인지 보여주므로, 안내 문구 자체는 챕터 유무와
            상관없이 하나만 쓴다 — 관리자가 고칠 문구도 하나로 줄어든다. */}
        {messages.length === 0 && !question && (
          <div className="msg ai">
            <EditableText as="span" contentKey="aiTutor.emptyState" defaultText="구조역학에 대해 궁금한 점을 물어보세요." />
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
