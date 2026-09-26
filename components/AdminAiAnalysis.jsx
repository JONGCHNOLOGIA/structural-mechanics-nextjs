'use client';

import { useState } from 'react';

// 교수자 통계 화면(components/AdminStatsView.jsx) 맨 위에 붙는 "AI 학습 분석".
// [전체 학습 현황]/[주요 학습 주제]/[반복적으로 어려움을 보인 주제] 세 카드는 Supabase에서
// 이미 집계된 숫자(overall/topTopics/toughTopics prop)로 즉시 채워지고, 나머지 두 카드
// ([AI 분석]/[수업 참고])는 버튼을 눌러야 그 숫자를 서버(/api/analyze-learning)로 보내
// Gemini가 만든 문단을 채운다 — AI는 원본 DB를 조회하지 않고 이 요약 숫자만 본다.
export default function AdminAiAnalysis({ overall, topTopics, toughTopics }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { analysis, suggestion }
  const [error, setError] = useState(null);
  const [showPayload, setShowPayload] = useState(false);

  const payload = {
    overall,
    topTopics: topTopics.map((t) => ({ label: t.label, visitors: t.visitors })),
    toughTopics: toughTopics.map((t) => ({ label: t.label, detail: t.detail })),
  };

  async function runAnalysis() {
    if (loading) return;
    setLoading(true);
    setError(null);
    // 다른 Gemini 호출부(AiTutorPanel, InterpretPanel)와 같은 이유로 클라이언트 쪽에도
    // 시간제한을 둔다 — 서버 라우트의 maxDuration(60초)보다 15초 여유를 더 준다.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);
    try {
      const res = await fetch('/api/analyze-learning', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stats: payload }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '분석을 받아오지 못했어요.');
      setResult({ analysis: data.analysis, suggestion: data.suggestion });
    } catch (err) {
      setError(err.name === 'AbortError' ? '응답이 너무 오래 걸려서 중단했어요. 다시 시도해주세요.' : err.message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="col-label">AI 학습 분석</div>
        <button type="button" className="ai-analysis-run-btn" onClick={runAnalysis} disabled={loading}>
          {loading ? '🧠 분석하는 중...' : result ? '🧠 다시 분석하기' : '🧠 AI 학습 분석 실행'}
        </button>
      </div>

      <div className="ai-analysis-grid">
        <AnalysisCard title="전체 학습 현황">
          <StatRow label="전체 학생" value={`${overall.totalStudents}명`} />
          <StatRow label="최근 7일 학습 학생" value={`${overall.activeStudents7d}명`} />
          <StatRow label="문제 풀이" value={`${overall.totalProblemAttempts}회`} />
          <StatRow label="AI Tutor 이용" value={`${overall.totalAiTutorMessages}회`} />
        </AnalysisCard>

        <AnalysisCard title="주요 학습 주제">
          {topTopics.length === 0 ? (
            <Muted>아직 방문 기록이 없어요.</Muted>
          ) : (
            topTopics.map((t) => <ListRow key={t.label} label={t.label} detail={`${t.visitors}명`} />)
          )}
        </AnalysisCard>

        <AnalysisCard title="반복적으로 어려움을 보인 주제">
          {toughTopics.length === 0 ? (
            <Muted>아직 표본이 적어 뚜렷한 경향이 나타나지 않아요.</Muted>
          ) : (
            toughTopics.map((t) => <ListRow key={t.label} label={t.label} detail={t.detail} />)
          )}
        </AnalysisCard>

        <AnalysisCard title="AI 분석">
          {error ? (
            <div className="error-box">⚠ {error}</div>
          ) : result ? (
            <div className="ai-analysis-text">{result.analysis || '(내용 없음)'}</div>
          ) : (
            <Muted>{loading ? '분석하는 중...' : '위 버튼을 눌러 AI 분석을 생성하세요.'}</Muted>
          )}
        </AnalysisCard>

        <AnalysisCard title="수업 참고">
          {!error && result ? (
            <div className="ai-analysis-text">{result.suggestion || '(내용 없음)'}</div>
          ) : !error ? (
            <Muted>{loading ? '분석하는 중...' : '위 버튼을 눌러 AI 분석을 생성하세요.'}</Muted>
          ) : null}
        </AnalysisCard>
      </div>

      <button type="button" className="ai-analysis-payload-toggle" onClick={() => setShowPayload((v) => !v)}>
        {showPayload ? '▲ AI에게 전달한 데이터 숨기기' : '▼ AI에게 전달한 데이터 보기 (디버그용)'}
      </button>
      {showPayload && <pre className="ai-analysis-payload">{JSON.stringify(payload, null, 2)}</pre>}
    </div>
  );
}

function AnalysisCard({ title, children }) {
  return (
    <div className="ai-analysis-card">
      <div className="ai-analysis-card-title">{title}</div>
      <div className="ai-analysis-card-body">{children}</div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="ai-analysis-stat-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ListRow({ label, detail }) {
  return (
    <div className="ai-analysis-list-row">
      <span>{label}</span>
      <span className="ai-analysis-list-detail">{detail}</span>
    </div>
  );
}

function Muted({ children }) {
  return <div style={{ fontSize: 12.5, color: 'var(--gray-soft)' }}>{children}</div>;
}
