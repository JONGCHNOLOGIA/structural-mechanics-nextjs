'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import FloatingActions from '@/components/FloatingActions';
import EditableText from '@/components/EditableText';
import { chapters1 } from '@/lib/chapters1';
import { chapters as chapters2 } from '@/lib/chapters';
import { listUnfinishedPgSessions } from '@/lib/pgSession';
import { fetchRecentAttempts } from '@/lib/progress';

// "문제 제작 1" / "문제 제작 2"로 나뉘어 있던 메뉴를 하나("문제 제작")로 합치고, 그 안에서
// 과목을 고르는 진입 화면. 건축공학과 홈페이지 하단 "일반공지 / 학사공지" 2단 게시판 레이아웃을
// 그대로 가져와서 왼쪽 칸=구조역학 1, 오른쪽 칸=구조역학 2로 바꿨다.
// "더보기" 자리는 실제 문제 생성기로 들어가는 "문제 만들기" 링크가 되고, 게시글 목록 자리는
// 그 과목의 챕터 목록(CH.1~5 / CH.6~10)으로 채운다 — 실제 공지 데이터가 없으니 자연스럽게 맞아떨어진다.

const SUBJECTS = [
  { subject: 'problem-generator-1', label: '구조역학 1', href: '/subjects/structural-mechanics-1/problem-generator', chapters: chapters1 },
  { subject: 'problem-generator-2', label: '구조역학 2', href: '/subjects/structural-mechanics-2/problem-generator', chapters: chapters2 },
];

function findSubtopicName(chapterNum, slug) {
  for (const { chapters, label } of SUBJECTS) {
    const ch = chapters.find((c) => c.num === chapterNum);
    const st = ch?.subtopics.find((s) => s.slug === slug);
    if (ch && st) return { text: `${ch.num} · ${st.name}`, subjectLabel: label };
  }
  return null;
}

function SubjectColumn({ heading, chapters, generatorHref }) {
  return (
    <div style={{ flex: '1 1 380px', minWidth: 300 }}>
      {/* CHAPTERS/SECTIONS 라벨(.col-label)과 같은 글씨체 — 네이비, 22px, 600, 대문자 */}
      <div className="col-label" style={{ marginBottom: 6 }}>
        {heading}
      </div>
      <Link
        href={generatorHref}
        style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: 'var(--crimson)', marginBottom: 14 }}
      >
        문제 만들기 +
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {chapters.map((ch, i) => (
          <Link
            key={ch.num}
            href={generatorHref}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16,
              padding: '11px 0', borderBottom: i < chapters.length - 1 ? '1px solid var(--line)' : 'none',
              color: 'inherit',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {ch.num} · {ch.title}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--gray-soft)', fontWeight: 600, flexShrink: 0 }}>
              {ch.ready ? `${ch.subtopics.length}개 소주제` : '준비중'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// 왼쪽 "이어서 풀기" — 정답 확인을 안 한 문제가 남은 채로 떠난 생성 세션(과목별 최대 1개, 로컬
// 브라우저에만 저장됨)이 있으면 과목당 한 줄씩 보여준다. 하나도 없으면 안내문만 남긴다.
function ContinueSolvingPanel() {
  const [sessions, setSessions] = useState(null); // null = 아직 확인 전(localStorage는 클라이언트에서만)

  useEffect(() => {
    setSessions(listUnfinishedPgSessions(SUBJECTS));
  }, []);

  return (
    <div style={{ flex: '1 1 380px', minWidth: 300 }}>
      <div className="col-label" style={{ marginBottom: 6 }}>
        이어서 풀기
      </div>
      <EditableText
        as="div"
        contentKey="problemGeneratorHub.continueIntro"
        defaultText="정답 확인을 안 하고 나온 문제가 있으면 여기서 이어서 풀 수 있어요."
        style={{ fontSize: 12, color: 'var(--gray-soft)', marginBottom: 14 }}
      />
      {sessions === null ? null : sessions.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--gray-soft)', padding: '18px 0' }}>이어서 풀 문제가 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sessions.map((s, i) => (
            <Link
              key={s.subject}
              href={`${s.href}?resume=1`}
              style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16,
                padding: '11px 0', borderBottom: i < sessions.length - 1 ? '1px solid var(--line)' : 'none',
                color: 'inherit',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{s.label}</span>
              <span style={{ fontSize: 12.5, color: 'var(--crimson)', fontWeight: 700, flexShrink: 0 }}>
                {s.total}문제 중 {s.remaining}문제 남음
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// 오른쪽 "문제 다시보기" — 정답 확인을 마친 최근 시도들을 최신순으로 나열하고, 맞았으면 초록 O,
// 틀렸으면 빨강 X를 각 줄 오른쪽에 붙인다. 랜덤으로 생성됐던 문제 지문 자체는 서버에 남지 않아서
// 다시 보여줄 순 없고, 어떤 소주제를 언제 풀어서 맞았는지/틀렸는지만 돌아본다.
function ReviewPanel() {
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    fetchRecentAttempts(20).then(setAttempts);
  }, []);

  const rows = (attempts || [])
    .map((a) => {
      const found = findSubtopicName(a.chapter_num, a.subtopic_slug);
      if (!found) return null;
      return { ...found, isCorrect: a.is_correct, key: `${a.chapter_num}::${a.subtopic_slug}::${a.created_at}` };
    })
    .filter(Boolean);

  return (
    <div style={{ flex: '1 1 380px', minWidth: 300 }}>
      <div className="col-label" style={{ marginBottom: 6 }}>
        문제 다시보기
      </div>
      <EditableText
        as="div"
        contentKey="problemGeneratorHub.reviewIntro"
        defaultText="정답 확인까지 마친 문제들을 최근 순서로 보여줘요. 맞은 문제는 O, 틀린 문제는 X예요."
        style={{ fontSize: 12, color: 'var(--gray-soft)', marginBottom: 14 }}
      />
      {attempts === null ? null : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--gray-soft)', padding: '18px 0' }}>아직 채점까지 마친 문제가 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r, i) => (
            <div
              key={r.key}
              style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16,
                padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                {r.subjectLabel} · {r.text}
              </span>
              <span
                style={{
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                  color: r.isCorrect ? 'var(--teal)' : 'var(--crimson)',
                }}
              >
                {r.isCorrect ? 'O' : 'X'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProblemGeneratorHub() {
  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active="problem-generator" />

      <div className="pg-wrap" style={{ maxWidth: 1600, margin: '48px auto 0' }}>
        {/* "이어서 학습하기"(components/ContinueLearning.jsx)와 동일한 제목 크기·굵기·색 */}
        <div style={{ fontSize: 56, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>
          문제 제작
        </div>
        <EditableText
          contentKey="problemGeneratorHub.intro"
          defaultText="과목을 골라 문제 만들기로 들어가면, 각 소주제의 계산기와 똑같은 공식으로 매번 새로운 숫자를 뽑아 문제를 만들어요."
          style={{ fontSize: 14.5, color: 'var(--gray)', marginBottom: 8 }}
        />
      </div>

      <div className="pg-wrap" style={{ maxWidth: 1600, margin: '32px auto 0', display: 'flex', gap: 60, flexWrap: 'wrap' }}>
        <SubjectColumn heading="구조역학 1" chapters={chapters1} generatorHref="/subjects/structural-mechanics-1/problem-generator" />
        <SubjectColumn heading="구조역학 2" chapters={chapters2} generatorHref="/subjects/structural-mechanics-2/problem-generator" />
      </div>

      <div className="pg-wrap" style={{ maxWidth: 1600, margin: '48px auto 0', paddingBottom: 64, display: 'flex', gap: 60, flexWrap: 'wrap' }}>
        <ContinueSolvingPanel />
        <ReviewPanel />
      </div>

      <FloatingActions />
    </div>
  );
}
