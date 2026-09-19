'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { supabase } from '@/lib/supabaseClient';

const ECAMPUS_URL = 'https://ecampus.sejong.ac.kr/';

// 로비(app/page.js) 헤더와 동일한 로고 락업 + 가운데 네비 + 우측 로그인/바로가기 버튼을
// 모든 페이지(챕터 상세, 문제 제작, 단면 특성 계산기 등)에서 그대로 재사용하기 위한 공용 컴포넌트.
// active로 어떤 네비 항목을 강조할지 정한다: 'sm1' | 'sm2' | 'problem-generator'(허브)
// | 'problem-generator-1' | 'problem-generator-2'(과목별 생성기 화면 — 이 둘도 "문제 제작" 항목을 강조한다).
export default function SiteHeader({ active = 'sm2' }) {
  const isProblemGenerator = active === 'problem-generator' || active === 'problem-generator-1' || active === 'problem-generator-2';

  const { userId, isAdmin } = useUser();
  const router = useRouter();

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // 세션이 이미 만료됐거나 네트워크가 끊겨도, 어쨌든 로그인 화면으로는 보내준다.
    }
    router.replace('/');
  }

  return (
    <header className="home-header">
      <div className="home-header-inner">
        <Link href="/" className="site-logo">
          <img src="/brand/sejong-archeng-logo.png" alt="세종대학교 건축공학과" className="site-logo-img" />
        </Link>

        <nav className="site-nav">
          <Link href="/" className={'site-nav-item' + (active === 'sm1' ? ' active' : '')}>
            구조역학 1
          </Link>
          <Link href="/subjects/structural-mechanics-2" className={'site-nav-item' + (active === 'sm2' ? ' active' : '')}>
            구조역학 2
          </Link>
          <Link href="/problem-generator" className={'site-nav-item' + (isProblemGenerator ? ' active' : '')}>
            문제 제작
          </Link>
          {/* 통계는 항상 노출되지만, role='instructor'("관리자로 시연" 데모 포함)가 아니면
              회색으로 비활성 처리만 하고 링크는 걸지 않는다. */}
          {isAdmin ? (
            <Link href="/admin/stats" className={'site-nav-item' + (active === 'admin-stats' ? ' active' : '')}>
              통계
            </Link>
          ) : (
            <span className="site-nav-item disabled" title="관리자 계정만 이용 가능">
              통계
            </span>
          )}
        </nav>

        <div className="header-right">
          {userId ? (
            <button className="btn-outline" onClick={handleLogout} aria-label="로그아웃">
              로그아웃
            </button>
          ) : (
            <Link href="/login" className="btn-outline">
              로그인
            </Link>
          )}
          <a href={ECAMPUS_URL} target="_blank" rel="noopener noreferrer" className="btn-solid">
            집현캠퍼스 ↗
          </a>
        </div>
      </div>
    </header>
  );
}
