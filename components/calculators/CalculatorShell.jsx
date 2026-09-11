'use client';

import Link from 'next/link';
import { useUser } from '@/components/UserProvider';

/*
  프로토타입의 "상세 페이지" 틀(detail-header + tabs + panels)을 그대로 옮긴 것.
  프로토타입은 탭을 눌러도 페이지 이동 없이 같은 화면에서 JS로 다시 그렸지만,
  여기서는 소주제마다 실제 Next.js 라우트가 있어서 탭 = Link(페이지 이동)로 동작함.
  보이는 모습과 눌렀을 때의 결과(다른 소주제로 전환)는 동일함.
*/
export default function CalculatorShell({ chapter, activeSlug, children }) {
  const { displayName, studentId } = useUser();

  return (
    <div>
      <div className="detail-header">
        <div className="subject-title">
          <Link href="/" className="back-link">
            ← 목록으로
          </Link>
          <span>구조역학 2 — {chapter.title}</span>
        </div>
        <div className="user-tag">
          {studentId} {displayName}
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
