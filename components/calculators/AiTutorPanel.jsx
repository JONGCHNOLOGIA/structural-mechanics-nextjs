import EditableText from '@/components/EditableText';

// 프로토타입의 aiHTMLPlaceholder()를 그대로 옮긴 것. 모든 계산기 페이지에서 동일하게 재사용.
export default function AiTutorPanel() {
  return (
    <div className="panel panel-ai">
      <h3>
        AI TUTOR <span className="badge" style={{ marginLeft: 6 }}>준비중</span>
      </h3>
      <div className="chat-log">
        <EditableText
          as="div"
          className="msg ai"
          contentKey="aiTutor.exampleAiMsg"
          defaultText="이 계산 결과에 대해 궁금한 점이 있으면 물어보세요. (백엔드 연결 전 — 예시 문구)"
        />
        <EditableText as="div" className="msg user" contentKey="aiTutor.exampleUserMsg" defaultText="이 값이 왜 이렇게 나오나요?" />
      </div>
      <div className="chat-input">
        <input type="text" placeholder="질문을 입력하세요" disabled />
        <button disabled aria-label="전송">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l16-8-6 16-3-7-7-1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
