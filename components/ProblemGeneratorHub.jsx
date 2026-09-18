'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import FloatingActions from '@/components/FloatingActions';
import EditableText from '@/components/EditableText';
import { chapters1 } from '@/lib/chapters1';
import { chapters as chapters2 } from '@/lib/chapters';

// "문제 제작 1" / "문제 제작 2"로 나뉘어 있던 메뉴를 하나("문제 제작")로 합치고, 그 안에서
// 과목을 고르는 진입 화면. 건축공학과 홈페이지 하단 "일반공지 / 학사공지" 2단 게시판 레이아웃을
// 그대로 가져와서 왼쪽 칸=구조역학 1, 오른쪽 칸=구조역학 2로 바꿨다.
// "더보기" 자리는 실제 문제 생성기로 들어가는 "문제 만들기" 링크가 되고, 게시글 목록 자리는
// 그 과목의 챕터 목록(CH.1~5 / CH.6~10)으로 채운다 — 실제 공지 데이터가 없으니 자연스럽게 맞아떨어진다.

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

export default function ProblemGeneratorHub() {
  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active="problem-generator" />

      <div style={{ maxWidth: 1600, margin: '48px auto 0', padding: '0 64px' }}>
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

      <div style={{ maxWidth: 1600, margin: '32px auto 0', padding: '0 64px 64px', display: 'flex', gap: 60, flexWrap: 'wrap' }}>
        <SubjectColumn heading="구조역학 1" chapters={chapters1} generatorHref="/subjects/structural-mechanics-1/problem-generator" />
        <SubjectColumn heading="구조역학 2" chapters={chapters2} generatorHref="/subjects/structural-mechanics-2/problem-generator" />
      </div>

      <FloatingActions />
    </div>
  );
}
