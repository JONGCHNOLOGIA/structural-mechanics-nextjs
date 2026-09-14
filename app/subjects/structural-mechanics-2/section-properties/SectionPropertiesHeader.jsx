'use client';

import Link from 'next/link';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';

export default function SectionPropertiesHeader() {
  const { displayName, studentId } = useUser();
  return (
    <div className="detail-header">
      <div className="subject-title">
        <Link href="/" className="back-link">
          ← 목록으로
        </Link>
        <span>구조역학 2 — 단면 특성 계산기</span>
      </div>
      <div className="header-right">
        <LogoutButton />
        <div className="user-tag">
          {studentId} {displayName}
        </div>
      </div>
    </div>
  );
}
