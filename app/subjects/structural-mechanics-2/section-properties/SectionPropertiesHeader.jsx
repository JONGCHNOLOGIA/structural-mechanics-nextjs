'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

export default function SectionPropertiesHeader() {
  return (
    <>
      <SiteHeader active="sm2" />
      <div className="page-subheader">
        <Link href="/" className="back-link">
          ← 목록으로
        </Link>
        <span className="page-subheader-title">단면 특성 계산기</span>
      </div>
    </>
  );
}
