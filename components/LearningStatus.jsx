'use client';

import { useRouter } from 'next/navigation';
import { chapters as sm2Chapters } from '@/lib/chapters';

function resolveTopic(chapters, chapterNum, slug) {
  const chapter = chapters.find((c) => c.num === chapterNum);
  const subtopic = chapter?.subtopics.find((s) => s.slug === slug);
  if (!chapter || !subtopic) return null;
  return { chapter, subtopic, href: `${chapter.base}/${subtopic.slug}` };
}

/*
  홈 화면 "학습 현황" + "최근 틀린 개념".
  데이터 출처는 lib/progress.js의 problem_attempts(정답 확인 후 본인이 맞았는지/틀렸는지 스스로
  표시한 기록) — "개념 이해"와 "계산 능력"은 AI 채점/AI 튜터 대화 분석이 있어야 계산할 수 있는
  지표라 아직 연결 전이라, 지금은 "문제 풀이 %"와 "오답 횟수"만 실제 값이고 나머지 둘은
  "AI 연결 후 제공" 표시로 자리만 잡아둔다.
*/
// problemGeneratorHref: 이 과목의 문제 생성기 경로. 아직 문제은행이 없는 과목(구조역학 1)은
// null을 받아 "다시 풀기" 버튼을 숨긴다 — 눌러도 못 만드는 버튼을 두지 않기 위함.
export default function LearningStatus({ summary, chapters = sm2Chapters, problemGeneratorHref = '/subjects/structural-mechanics-2/problem-generator' }) {
  const router = useRouter();
  const rows = (summary || [])
    .map((s) => {
      const topic = resolveTopic(chapters, s.chapterNum, s.slug);
      if (!topic) return null;
      const total = s.correct + s.wrong;
      const solveRate = total > 0 ? Math.round((s.correct / total) * 100) : null;
      return { ...s, ...topic, total, solveRate };
    })
    .filter(Boolean);

  if (rows.length === 0) return null;

  const wrongTopics = rows
    .filter((r) => r.wrong > 0)
    .sort((a, b) => new Date(b.lastWrongAt) - new Date(a.lastWrongAt))
    .slice(0, 3);

  return (
    <div style={{ maxWidth: 1600, margin: '28px auto 0', padding: '0 64px' }}>
      <div className="col-label" style={{ marginBottom: 14 }}>
        학습 현황
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: wrongTopics.length > 0 ? 28 : 0 }}>
        {rows.map((r) => (
          <div
            key={`${r.chapterNum}::${r.slug}`}
            style={{
              flex: '1 1 260px',
              maxWidth: 320,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 0,
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--crimson)', marginBottom: 2 }}>{r.chapter.num}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{r.subtopic.name}</div>
            <ProgressRow label="개념 이해" placeholder />
            <ProgressRow label="계산 능력" placeholder />
            <ProgressRow label="문제 풀이" pct={r.solveRate} />
            <TreeRow last label="오답" value={`${r.wrong}회`} highlight={r.wrong > 0} />
          </div>
        ))}
      </div>

      {wrongTopics.length > 0 && (
        <>
          <div className="col-label" style={{ marginBottom: 14 }}>
            최근 틀린 개념
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wrongTopics.map((r) => (
              <div
                key={`${r.chapterNum}::${r.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 0,
                  padding: '12px 18px',
                }}
              >
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--crimson)', marginRight: 8 }}>{r.chapter.num}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{r.subtopic.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-soft)', marginLeft: 10 }}>오답 {r.wrong}회</span>
                </div>
                {problemGeneratorHref && (
                  <button
                    className="add-block"
                    style={{ margin: 0 }}
                    onClick={() => router.push(`${problemGeneratorHref}?ch=${r.chapterNum}&slug=${r.slug}`)}
                  >
                    다시 풀기
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProgressRow({ label, pct, placeholder }) {
  return <TreeRow label={label} value={placeholder ? 'AI 연결 후 제공' : pct == null ? '—' : `${pct}%`} muted={placeholder} pct={placeholder ? null : pct} />;
}

function TreeRow({ label, value, pct, last, muted, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: last ? 0 : 5, fontFamily: "'JetBrains Mono',monospace" }}>
      <span style={{ fontSize: 12, color: 'var(--gray-soft)', width: 14 }}>{last ? '└' : '├'}</span>
      <span style={{ fontSize: 12.5, color: 'var(--gray)', width: 72 }}>{label}</span>
      {typeof pct === 'number' && (
        <span style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 0, overflow: 'hidden', maxWidth: 70 }}>
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--teal)' }} />
        </span>
      )}
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: muted ? 'var(--gray-soft)' : highlight ? 'var(--crimson)' : 'var(--ink)',
          fontStyle: muted ? 'italic' : 'normal',
          marginLeft: typeof pct === 'number' ? 0 : 'auto',
        }}
      >
        {value}
      </span>
    </div>
  );
}
