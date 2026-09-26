'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import SiteHeader from '@/components/SiteHeader';
import EditableText from '@/components/EditableText';
import { chapters1 } from '@/lib/chapters1';
import { chapters as chapters2 } from '@/lib/chapters';
import { fetchWrongRateBySubtopic, fetchVisitCountsBySubtopic, fetchAiTutorStats, fetchOverallLearningStats } from '@/lib/adminStats';
import AdminAiAnalysis from '@/components/AdminAiAnalysis';

const ALL_CHAPTERS = [...chapters1, ...chapters2];

function subtopicName(chapterNum, slug) {
  const chapter = ALL_CHAPTERS.find((c) => c.num === chapterNum);
  const subtopic = chapter?.subtopics.find((s) => s.slug === slug);
  return { chapterTitle: chapter?.title || chapterNum, name: subtopic?.name || slug };
}

// 교수자(role='instructor') 전용 — 맨 위 "AI 학습 분석" 요약 카드에 이어, "어떤 유형을
// 어려워하는지"(오답률) / "어떤 시각화자료를 많이 쓰는지"(방문수)를 한 화면에 모은 것.
// 학생 개인정보(이름·학번)는 집계 과정에서 아예 빼고 소주제·챕터 단위로만 합쳐서 보여준다.
// (AI 튜터 질문 원문 목록 섹션은 화면에서 뺐지만, 그 집계(aiStats)는 "반복적으로 어려움을
// 보인 주제" 카드의 신호로 여전히 쓴다 — 아래 toughTopics 참고)
export default function AdminStatsView() {
  const { isAdmin, ready } = useUser();
  const [wrongRates, setWrongRates] = useState(null);
  const [visits, setVisits] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [overall, setOverall] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchWrongRateBySubtopic().then(setWrongRates);
    fetchVisitCountsBySubtopic().then(setVisits);
    fetchAiTutorStats().then(setAiStats);
    fetchOverallLearningStats().then(setOverall);
  }, [isAdmin]);

  // "주요 학습 주제" 카드 — 방문 수 상위 5개를 그대로.
  const topTopics = (visits || []).slice(0, 5).map((r) => {
    const { chapterTitle, name } = subtopicName(r.chapterNum, r.slug);
    return { label: `${r.chapterNum} ${name}`, chapterTitle, visitors: r.visitors };
  });

  // "반복적으로 어려움을 보인 주제" 카드 — 오답률 상위(표본이 있을 때만)와 AI 튜터에게 반복
  // 질문이 몰린 챕터(질문 2건 이상)를 합쳐서 보여준다. chat_logs는 챕터 단위까지만 기록해서
  // 소주제 단위 신호(오답률)와 챕터 단위 신호(AI 질문 수)가 섞여 있을 수 있다.
  const bySubtopic = (wrongRates || [])
    .filter((r) => r.wrongRate > 0)
    .slice(0, 5)
    .map((r) => {
      const { name } = subtopicName(r.chapterNum, r.slug);
      return { label: `${r.chapterNum} ${name}`, detail: `오답률 ${r.wrongRate.toFixed(0)}% (${r.wrong}/${r.total}회)` };
    });
  const byAiQuestions = (aiStats?.byChapter || [])
    .filter((c) => c.count >= 2 && ALL_CHAPTERS.some((ch) => ch.num === c.chapterNum))
    .slice(0, 5)
    .map((c) => {
      const chapter = ALL_CHAPTERS.find((ch) => ch.num === c.chapterNum);
      return { label: `${c.chapterNum} ${chapter.title}`, detail: `AI 튜터 질문 ${c.count}건` };
    });
  const seenLabels = new Set();
  const toughTopics = [...bySubtopic, ...byAiQuestions].filter((t) => {
    if (seenLabels.has(t.label)) return false;
    seenLabels.add(t.label);
    return true;
  });

  if (!ready) return null;

  if (!isAdmin) {
    return (
      <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
        <SiteHeader active="admin-stats" />
        <div style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <EditableText as="h3" contentKey="adminStats.deniedTitle" defaultText="관리자(교수자) 계정만 볼 수 있는 페이지예요." style={{ marginBottom: 10 }} />
          <EditableText
            as="p"
            contentKey="adminStats.deniedBody"
            defaultText='로그인 화면의 "관리자로 시연" 버튼으로 들어오면 확인할 수 있습니다.'
            style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20 }}
          />
          <Link href="/" className="btn-outline">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active="admin-stats" />

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '48px 64px 64px' }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>통계</div>
        <EditableText
          as="p"
          contentKey="adminStats.intro"
          defaultText="소주제·챕터 단위로 집계한 값을 보여줍니다."
          style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 36 }}
        />

        {overall === null ? <Loading /> : <AdminAiAnalysis overall={overall} topTopics={topTopics} toughTopics={toughTopics} />}

        <Section title="어떤 유형을 어려워하는지 — 소주제별 오답률">
          {wrongRates === null ? (
            <Loading />
          ) : wrongRates.length === 0 ? (
            <Empty contentKey="adminStats.wrongRateEmpty" defaultText="아직 문제를 3번 이상 풀어본 소주제가 없어요." />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>챕터</th>
                  <th>소주제</th>
                  <th>오답률</th>
                  <th>시도 수</th>
                </tr>
              </thead>
              <tbody>
                {wrongRates.slice(0, 15).map((r) => {
                  const { chapterTitle, name } = subtopicName(r.chapterNum, r.slug);
                  return (
                    <tr key={`${r.chapterNum}::${r.slug}`}>
                      <td>
                        {r.chapterNum} <span style={{ color: 'var(--gray-soft)' }}>{chapterTitle}</span>
                      </td>
                      <td>{name}</td>
                      <td>
                        <WrongRateBar pct={r.wrongRate} />
                      </td>
                      <td>{r.wrong}회 오답 / {r.total}회</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="어떤 시각화자료를 많이 쓰는지 — 소주제별 방문(학생 수)">
          {visits === null ? (
            <Loading />
          ) : visits.length === 0 ? (
            <Empty contentKey="adminStats.visitsEmpty" defaultText="아직 방문 기록이 없어요." />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>챕터</th>
                  <th>소주제</th>
                  <th>방문 학생 수</th>
                </tr>
              </thead>
              <tbody>
                {visits.slice(0, 15).map((r) => {
                  const { chapterTitle, name } = subtopicName(r.chapterNum, r.slug);
                  const max = visits[0]?.visitors || 1;
                  return (
                    <tr key={`${r.chapterNum}::${r.slug}`}>
                      <td>
                        {r.chapterNum} <span style={{ color: 'var(--gray-soft)' }}>{chapterTitle}</span>
                      </td>
                      <td>{name}</td>
                      <td>
                        <VisitBar count={r.visitors} max={max} studentIds={r.studentIds} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <div className="col-label" style={{ marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <EditableText
      as="div"
      contentKey="adminStats.loading"
      defaultText="불러오는 중..."
      style={{ fontSize: 13, color: 'var(--gray-soft)' }}
    />
  );
}

function Empty({ contentKey, defaultText }) {
  return <EditableText as="div" contentKey={contentKey} defaultText={defaultText} style={{ fontSize: 13, color: 'var(--gray-soft)' }} />;
}

function WrongRateBar({ pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 120, height: 8, background: 'var(--bg)', display: 'inline-block', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${Math.min(100, pct)}%`, background: 'var(--crimson)' }} />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--crimson)' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// 막대에 마우스를 올리면 방문한 학생들의 학번을 title 툴팁으로 보여준다(브라우저 기본 툴팁 —
// 새 UI를 안 만들어도 돼서 간단함). 학번이 없는 계정은 lib/adminStats.js에서 이미 "익명"으로
// 채워져 있다.
function VisitBar({ count, max, studentIds = [] }) {
  const pct = (count / max) * 100;
  const tooltip = studentIds.length ? studentIds.join(', ') : undefined;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={tooltip}>
      <span style={{ width: 120, height: 8, background: 'var(--bg)', display: 'inline-block', overflow: 'hidden', cursor: tooltip ? 'help' : 'default' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--teal)' }} />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--teal)', cursor: tooltip ? 'help' : 'default' }}>{count}명</span>
    </div>
  );
}
