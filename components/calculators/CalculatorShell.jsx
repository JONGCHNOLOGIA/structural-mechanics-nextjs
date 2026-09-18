'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import SiteHeader from '@/components/SiteHeader';
import FloatingActions from '@/components/FloatingActions';
import { recordVisit } from '@/lib/progress';

/*
  프로토타입의 "상세 페이지" 틀(header + tabs + panels)을 그대로 옮긴 것.
  프로토타입은 탭을 눌러도 페이지 이동 없이 같은 화면에서 JS로 다시 그렸지만,
  여기서는 소주제마다 실제 Next.js 라우트가 있어서 탭 = Link(페이지 이동)로 동작함.
  보이는 모습과 눌렀을 때의 결과(다른 소주제로 전환)는 동일함.
  헤더는 로비(app/page.js)와 같은 SiteHeader를 재사용 — 그 아래에 목록으로 돌아가는 링크와
  챕터명만 얇게 붙인다. AI 튜터 패널은 이미 오른쪽 컬럼(panel-ai)에 항상 떠 있어서,
  플로팅 버튼에서는 설정만 남기고 AI 버튼은 뺀다(showAi=false).
*/
// homeHref를 따로 넘기지 않으면 과목에 맞는 로비로 돌아간다
// (구조역학 1은 사이트 첫 화면이라 '/', 구조역학 2는 자기 로비 경로).
const SUBJECT_HOME = { sm1: '/', sm2: '/subjects/structural-mechanics-2' };

export default function CalculatorShell({ chapter, activeSlug, children, subject = 'sm2', homeHref }) {
  const { userId } = useUser();
  const backHref = homeHref || SUBJECT_HOME[subject] || '/';

  // 소주제 페이지를 열 때마다 방문 시각 기록 → 홈 화면 "이어서 학습하기"에서 사용
  useEffect(() => {
    if (userId) recordVisit(chapter.num, activeSlug);
  }, [userId, chapter.num, activeSlug]);

  return (
    <div>
      <SiteHeader active={subject} />

      <div className="page-subheader">
        <Link href={backHref} className="back-link">
          ← 목록으로
        </Link>
        <span className="page-subheader-title">{chapter.num} · {chapter.title}</span>
      </div>

      <div className="tabs">
        {chapter.subtopics.map((st) => (
          <Link key={st.slug} href={`${chapter.base}/${st.slug}`} className={'tab' + (st.slug === activeSlug ? ' active' : '')}>
            {st.name}
          </Link>
        ))}
      </div>

      <div className="panels">{children}</div>

      <FloatingActions showAi={false} />
    </div>
  );
}
