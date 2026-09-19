'use client';

import Link from 'next/link';
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

  // 로그아웃이 "눌러도 아무 일도 안 일어나는" 것처럼 보이는 경우가 있어서, 실패할 수 있는
  // 지점을 하나씩 다 막아뒀다:
  //  (1) signOut()은 기본이 global이라 서버에 요청을 보낸다 — 네트워크가 느리거나 토큰이 이미
  //      만료돼 있으면 여기서 오래 매달리거나 예외가 난다. 3초로 끊는다.
  //  (2) 그게 실패했어도 이 브라우저의 세션만은 확실히 지우도록 local scope로 한 번 더.
  //  (3) 그래도 남아있으면 localStorage의 세션 키를 직접 지운다.
  //  (4) router.replace()는 Next 서버에서 화면 데이터를 받아와야 해서, dev 서버가 꺼져 있거나
  //      응답이 느리면 화면이 그대로 멈춘 것처럼 보인다. 하드 이동이면 그 상황에서도 확실히 나간다.
  async function handleLogout() {
    try {
      await Promise.race([supabase.auth.signOut(), new Promise((resolve) => setTimeout(resolve, 3000))]);
    } catch (e) {
      // 무시 — 아래에서 로컬 세션을 직접 정리한다.
    }
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      // 무시
    }
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') && k.includes('auth-token'))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      // 무시 (사파리 프라이빗 모드 등에서 localStorage 접근이 막힐 수 있음)
    }
    window.location.href = '/';
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
