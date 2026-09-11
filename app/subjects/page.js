'use client';

import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';

export default function SubjectsPage() {
  const { displayName, studentId } = useUser();

  return (
    <div>
      <header>
        <div className="subject-title">과목 선택</div>
        <div className="header-right">
          <LogoutButton />
          <div className="user-tag">
            {studentId} {displayName}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 700, margin: '60px auto 0', padding: '0 40px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>안녕하세요, {displayName}님 👋</h1>
        <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 28 }}>공부할 과목을 선택해주세요.</p>

        <div className="chapter-list">
          <div className="chapter disabled">
            <div className="body">
              <span className="num">
                구조역학 1<span className="tag">준비중</span>
              </span>
              <div className="title">Mechanics of Materials 1</div>
              <div className="preview">다른 팀원이 만들고 있어요. 곧 열립니다.</div>
            </div>
          </div>

          <Link href="/" className="chapter" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="body">
              <span className="num">
                구조역학 2<span className="tag">입장 가능</span>
              </span>
              <div className="title">Mechanics of Materials 2</div>
              <div className="preview">보의 응력, 처짐, 부정정보까지 — 지금 바로 시작할 수 있어요.</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
