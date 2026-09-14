'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';
import SettingsButton from '@/components/SettingsButton';
import { recordVisit } from '@/lib/progress';

/*
  프로토타입의 "상세 페이지" 틀(detail-header + tabs + panels)을 그대로 옮긴 것.
  프로토타입은 탭을 눌러도 페이지 이동 없이 같은 화면에서 JS로 다시 그렸지만,
  여기서는 소주제마다 실제 Next.js 라우트가 있어서 탭 = Link(페이지 이동)로 동작함.
  보이는 모습과 눌렀을 때의 결과(다른 소주제로 전환)는 동일함.
*/
export default function CalculatorShell({ chapter, activeSlug, children }) {
  const { displayName, studentId, userId } = useUser();

  // 소주제 페이지를 열 때마다 방문 시각 기록 → 홈 화면 "이어서 학습하기"에서 사용
  useEffect(() => {
    if (userId) recordVisit(chapter.num, activeSlug);
  }, [userId, chapter.num, activeSlug]);

  return (
    <div>
      <div className="detail-header">
        <div className="subject-title">
          <Link href="/" className="back-link">
            ← 목록으로
          </Link>
          <span>구조역학 2 — {chapter.title}</span>
        </div>
        <div className="header-right">
          <SettingsButton />
          <LogoutButton />
          <div className="user-tag">
            {studentId} {displayName}
          </div>
        </div>
      </div>

      <div className="tabs">
        {chapter.subtopics.map((st) => (
          <Link key={st.slug} href={`${chapter.base}/${st.slug}`} className={'tab' + (st.slug === activeSlug ? ' active' : '')}>
            {st.name}
          </Link>
        ))}
      </div>

      <div className="panels">{children}</div>
    </div>
  );
}
