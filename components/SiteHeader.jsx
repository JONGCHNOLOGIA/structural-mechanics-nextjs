'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import { supabase } from '@/lib/supabaseClient';

const ECAMPUS_URL = 'https://ecampus.sejong.ac.kr/';

// 로비(app/page.js) 헤더와 동일한 로고 락업 + 가운데 네비 + 우측 로그인/바로가기 버튼을
// 모든 페이지(챕터 상세, 문제 제작, 단면 특성 계산기 등)에서 그대로 재사용하기 위한 공용 컴포넌트.
// active로 어떤 네비 항목을 강조할지 정한다: 'sm2' | 'problem-generator'.
export default function SiteHeader({ active = 'sm2' }) {
  const { userId } = useUser();
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
          <Link
            href="/subjects/structural-mechanics-2/problem-generator"
            className={'site-nav-item' + (active === 'problem-generator' ? ' active' : '')}
          >
            문제 제작
          </Link>
          <span className="site-nav-item disabled" title="준비중">
            커뮤니티
          </span>
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
